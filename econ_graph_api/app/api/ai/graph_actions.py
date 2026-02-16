"""
AI Graph Actions endpoint.

Endpoint:
- POST /graph-action: Generate nodes/edges/scenarios based on user prompt
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import google.generativeai as genai
import json

from app.core.config import settings
from app.core.logging import get_logger
from app.core.deps import get_current_user
from app.core.db import get_db
from app.models import User
from app.services.ai_usage import log_ai_usage, extract_usage_from_gemini_response

from .shared import GEMINI_MODEL, configure_gemini, clean_json_response

router = APIRouter()
logger = get_logger(__name__)


# ==================== REQUEST/RESPONSE MODELS ====================

class AiNodeDefinition(BaseModel):
    id: str
    label: str | None = None
    slug: str | None = None
    type: str | None = None  # "computed", "parameter", "composite"
    action: str = "create"  # "create", "update", "delete"
    unit: str | None = None
    description: str | None = None
    code: str | None = None
    inputs: list[str] = []
    value: float | None = None
    pos_x: float | None = None
    pos_y: float | None = None
    composite_id: str | None = None


class AiScenarioOverride(BaseModel):
    node_id: str
    mode: str = "value"  # "value" or "formula"
    value: float | None = None
    code: str | None = None


class AiScenarioDefinition(BaseModel):
    id: str | None = None
    name: str | None = None
    action: str = "create"  # "create", "update", "delete"
    overrides: list[AiScenarioOverride] = []


class AiCompositeDefinition(BaseModel):
    id: str
    name: str
    description: str | None = None
    input_slugs: list[str] = []


class AiGraphActionRequest(BaseModel):
    prompt: str
    context: str | None = None  # e.g. "dashboard" or "new_project"
    current_nodes: list[AiNodeDefinition] = []
    current_scenarios: list[AiScenarioDefinition] = []
    focus_node_ids: list[str] = []
    available_composites: list[AiCompositeDefinition] = []


class AiGraphActionResponse(BaseModel):
    project_name: str | None = None
    project_description: str | None = None
    composite_name: str | None = None
    composite_description: str | None = None
    nodes: list[AiNodeDefinition]
    scenarios: list[AiScenarioDefinition] = []
    explanation: str | None = None


# ==================== PROMPT ====================

GRAPH_ACTION_PROMPT = """
You are an expert Graph Architect for the "Smart Graph" application.
Your goal is to translate a user request into a structured graph of nodes with logical layout.

{context_instructions}

INPUT CONTEXT (FULL GRAPH):
{current_nodes_json}

INPUT CONTEXT (EXISTING SCENARIOS):
{current_scenarios_json}

FOCUS NODES (USER SELECTION):
{focus_nodes_info}

{composites_info}

CRITICAL INSTRUCTION ON CONTEXT vs FOCUS:
- "INPUT CONTEXT" contains the ENTIRE graph and EXISTING SCENARIOS. Use it to understand dependencies and the overall model.
- "FOCUS NODES" are the specific nodes the user has selected.
- If "FOCUS NODES" is NOT empty:
    - The user's question (e.g. "What is this?", "Fix this") refers to THESE nodes.
    - You MUST prioritize these nodes for explanations or modifications.
    - However, you CAN and SHOULD look at the "INPUT CONTEXT" to understand where these nodes come from (their inputs) or what they impact.
- If "FOCUS NODES" is empty:
    - The user is talking about the whole graph or asking to create something new.

NODE TYPES:
1. "parameter": A static value. Requires 'value' (default number).
2. "computed": A Python calculation.
3. "composite": A reusable module from the library. Requires 'composite_id'.
- API Nodes are strictly FORBIDDEN. Do not create them.

ACTIONS ("action" field):
- "create": Create a new node. Assign a NEW unique temp ID (e.g. "new_1").
- "update": Modify an EXISTING node. You MUST use the EXISTING node's ID.
- "delete": Delete an EXISTING node. You MUST use the EXISTING node's ID.

SCENARIOS:
- You can create or modify Scenarios to test different hypotheses (e.g. "Best Case", "High Inflation").
- A Scenario is a set of OVERRIDES applied to specific nodes.
- To create a scenario:
    - Set "action": "create"
    - Give it a "name"
    - Add "overrides" for the nodes you want to change.
- Override Structure:
    - **MANDATORY**: Set "node_id" to the REAL ID of the node you want to override (from INPUT CONTEXT).
    - **DO NOT** use "id" for the node ID. Use "node_id".
- Override Modes:
    - "value": Force a node to a specific number (e.g. Revenue = 120000). Set "value" field.
    - "formula": Change the calculation logic (e.g. Revenue = Revenue * 1.1). Set "code" field.
- IMPORTANT: When overriding a node, you MUST use its REAL ID (from INPUT CONTEXT).
- **TO DELETE A SCENARIO**:
    - Set "action": "delete"
    - Set "id" to the REAL ID of the scenario (from INPUT CONTEXT (EXISTING SCENARIOS)).
    - You MUST find the scenario ID from the list provided in context.

LAYOUT INSTRUCTIONS (CRITICAL):
- For NEW nodes ("create"), you MUST assign 'pos_x' and 'pos_y'.
- Use a STRICT TOP-TO-BOTTOM FLOW:
    1. **Row 1 (Inputs/Parameters)**: pos_y = 0
    2. **Row 2 (Calculations)**: pos_y = 250
    3. **Row 3 (Final Outputs)**: pos_y = 500
- **Horizontal Spacing (pos_x)**:
    - Start at pos_x = 0 for the first node in a row.
    - Increment pos_x by 300 for each subsequent node in the SAME row.
    - Reset pos_x to 0 when moving to a new row.

INSTRUCTIONS:
- Return a JSON object with:
    - "project_name": (Optional) Name of the new project if requested (ONLY in Project Editor).
    - "project_description": (Optional) Brief description.
    - "composite_name": (Optional) Name of the new composite (ONLY in New Composite Creation).
    - "composite_description": (Optional) Brief description.
    - "nodes": List of nodes to create/update/delete.
    - "scenarios": List of scenarios to create/update/delete.
    - "explanation": (MANDATORY) A short, helpful explanation of what you did OR the answer to the user's question.

- **LANGUAGE RULE**:
    - **DETECT** the language of the user's prompt (English, French, Spanish, etc.).
    - **GENERATE** the "explanation" content **IN THE SAME LANGUAGE**.
    - If the user writes in French, answer in French. If English, answer in English.

- **QUESTION ANSWERING MODE**:
    - If the user asks a question about the graph (e.g. "What is the profit?", "Explain the logic"), and does NOT ask for changes:
    - Return "nodes": [] (empty list).
    - Put the answer in the "explanation" field.
    - Be concise and helpful.

- **CRITICAL**: For "computed" nodes, you **MUST** populate the `inputs` list with the IDs of the nodes used in the calculation.
- **EMPTY INPUTS = BROKEN GRAPH**. If a node is "computed", it MUST have `inputs`.
- The arguments in `def compute(...)` MUST match the **slugs** of the nodes in the `inputs` list.
- **SLUG RULES (CRITICAL)**:
    - The "slug" is the unique identifier used in code variable names.
    - **FOR EXISTING NODES**: You MUST use the `slug` provided in the "INPUT CONTEXT". Do NOT guess or re-generate it from the label.
    - **FOR NEW NODES**: Generate a snake_case slug from the label (e.g. "Revenue" -> "revenue").

- **PYTHON CODE RULES**:
    - The `code` field MUST contain a FULL Python function definition: `def compute(arg1, arg2): ...`
    - The function MUST return a numeric value (int or float).
    - **FORBIDDEN**: `return null`, `return None`. This causes the graph to crash.
    - **FORBIDDEN**: `return`. You must return a value.
    - If you are unsure, return a static number (e.g. `return 100`) but **NEVER** `null`.
    - **BAD EXAMPLE**: `def compute(): return null` (CRASHES APP)
    - **GOOD EXAMPLE**: `def compute(revenue, cost): return revenue - cost`
- Use descriptive labels and units.
- **MANDATORY**: Provide a "description" for EVERY node. It should be a short sentence explaining what this node represents (e.g. "Monthly recurring revenue from subscriptions").

USING COMPOSITES:
- If the user asks to use a specific composite (e.g. "Use the Tax Calculator"), or if a composite in the library matches the need:
- Create a node with "type": "composite".
- Set "composite_id" to the ID of the composite from the LIBRARY list.
- Do NOT provide "code" or "value".
- Connect necessary inputs to this node using the "inputs" list.
- The composite's inputs are listed in the LIBRARY info. You should try to provide nodes that match these inputs.

CRITICAL: AVOID CIRCULAR DEPENDENCIES
- The graph MUST be a Directed Acyclic Graph (DAG).
- Node A cannot depend on Node B if Node B depends on Node A.
- If you have two variables that influence each other (e.g. Price and Demand), you MUST pick one as the independent Parameter and the other as the Computed node.
- Example: Do NOT make "Clicks" depend on "CPC" AND "CPC" depend on "Clicks".
- Instead: Make "CPC" a Parameter (fixed value) and "Clicks" a Computed node (Budget / CPC).

HANDLING PERCENTAGES (CRITICAL):
- If a node represents a percentage (e.g. "Tax Rate", "Conversion Rate", "Margin"):
    - Use unit "%".
    - The 'value' MUST be the human-readable number out of 100 (e.g. **20** for 20%, **0.5** for 0.5%). Do NOT use ratios like 0.2 or 0.005.
    - **FORMULA LOGIC**: When using a percentage node as an input in a `compute` function, you MUST divide it by 100.
    - Example: `return revenue * (margin_rate / 100)`

EXAMPLE USER PROMPT: "Create a profit model with Revenue (100k) and Cost (80k)"
EXAMPLE OUTPUT JSON:
{{
  "nodes": [
    {{ 
        "id": "n1", 
        "action": "create",
        "type": "parameter", 
        "label": "Revenue", 
        "value": 100000, 
        "unit": "EUR", 
        "description": "Total revenue generated from sales.",
        "pos_x": 0, 
        "pos_y": 0 
    }},
    {{ 
        "id": "n2", 
        "action": "create",
        "type": "parameter", 
        "label": "Cost", 
        "value": 80000, 
        "unit": "EUR", 
        "description": "Total operational costs.",
        "pos_x": 300, 
        "pos_y": 0 
    }},
    {{ 
      "id": "n3", 
      "action": "create",
      "type": "computed", 
      "label": "Profit", 
      "unit": "EUR", 
      "description": "Net profit calculated as Revenue minus Cost.",
      "inputs": ["n1", "n2"],
      "code": "def compute(revenue, cost):\\n    return revenue - cost",
      "pos_x": 0,
      "pos_y": 250
    }}
  ],
  "explanation": "I created a simple profit model with Revenue and Cost parameters, and a Profit calculation node."
}}
"""


# ==================== CONTEXT INSTRUCTIONS ====================

def get_context_instructions(context: str | None) -> str:
    """Get context-specific instructions based on the request context."""
    if context == 'composite_modification':
        return """
CONTEXT: COMPOSITE EDITOR (REUSABLE TEMPLATE)
- You are editing a reusable Composite Node template.
- **FORBIDDEN**: Do NOT create projects. Do NOT return "project_name" or "project_description".
- **GOAL**: Create a self-contained calculation flow.
- **INPUTS**: Nodes you create with NO incoming edges (Parameters) will become the composite's INPUTS.
- **OUTPUTS**: Leaf nodes (no outgoing edges) will become the composite's OUTPUTS.
- **LAYOUT**: Keep the same Top-to-Bottom flow (Inputs at y=0, Calculations at y=250, Outputs at y=500).
"""
    elif context == 'new_composite':
        return """
CONTEXT: NEW COMPOSITE CREATION
- The user wants to create a NEW reusable Composite Node template from scratch.
- **MANDATORY**: You MUST provide a "composite_name" and "composite_description".
- **FORBIDDEN**: Do NOT create projects. Do NOT return "project_name".
- **GOAL**: Create a self-contained calculation flow.
- **INPUTS**: Nodes you create with NO incoming edges (Parameters) will become the composite's INPUTS.
- **OUTPUTS**: Leaf nodes (no outgoing edges) will become the composite's OUTPUTS.
- **LAYOUT**: Keep the same Top-to-Bottom flow (Inputs at y=0, Calculations at y=250, Outputs at y=500).
"""
    elif context == 'refactoring':
        return """
CONTEXT: REFACTORING AGENT
- **GOAL**: Identify a cluster of nodes to EXTRACT into a reusable Composite.
- **INPUT**: The user has selected nodes (FOCUS NODES) or you must identify them from the graph.
- **ACTION**:
    1. **CREATE** a new node of type "composite" that will replace the cluster.
    2. **DELETE** the nodes that are being moved into the composite.
    3. **CONNECT** the new composite node to the rest of the graph (inputs/outputs).
- **MANDATORY**:
    - Provide "composite_name" and "composite_description" for the NEW composite being created.
    - The "nodes" list should contain:
        - The NEW composite node ("action": "create", "type": "composite").
        - The OLD nodes to be removed ("action": "delete").
        - Any edge updates needed (though edges are usually handled by the backend during extraction, you can suggest them).
- **CRITICAL**: Do NOT delete nodes if you don't replace them with a composite.
"""
    else:
        return """
CONTEXT: PROJECT EDITOR
- The user wants to build a model or a calculation flow.
- If the user asks to create a NEW project or model (e.g. "Create a Real Estate model"), OR if the context is "new_project", you MUST provide a "project_name" and "project_description".
- If the user just asks to add nodes to the current graph, leave "project_name" null.
"""


# ==================== ENDPOINT ====================

@router.post("/graph-action", response_model=AiGraphActionResponse)
async def generate_graph_action(
    request: AiGraphActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate graph modifications (nodes, edges, scenarios) based on user prompt."""
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    try:
        configure_gemini()
        model = genai.GenerativeModel(GEMINI_MODEL)

        context_instructions = get_context_instructions(request.context)

        # Identify focused nodes for the prompt
        focus_nodes_info = ""
        if request.focus_node_ids:
            focused_nodes = [n for n in request.current_nodes if n.id in request.focus_node_ids]
            focus_nodes_info = "\n".join([f"- {n.label} (ID: {n.id})" for n in focused_nodes])

        # Prepare available composites info
        composites_info = ""
        if request.available_composites:
            composites_info = "AVAILABLE COMPOSITES (LIBRARY):\n" + "\n".join([
                f"- {c.name} (ID: {c.id}): {c.description or 'No description'}. Inputs: {', '.join(c.input_slugs)}"
                for c in request.available_composites
            ])

        system_prompt = GRAPH_ACTION_PROMPT.format(
            context_instructions=context_instructions,
            current_nodes_json=json.dumps([n.model_dump() for n in request.current_nodes], indent=2) if request.current_nodes else "[]",
            current_scenarios_json=json.dumps([s.model_dump() for s in request.current_scenarios], indent=2) if request.current_scenarios else "[]",
            focus_nodes_info=focus_nodes_info or "(None)",
            composites_info=composites_info
        )

        response = model.generate_content(
            contents=[
                {"role": "user", "parts": [system_prompt + f"\n\nContext: {request.context or 'unknown'}\nUser Request: " + request.prompt]}
            ],
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                response_mime_type="application/json"
            )
        )

        # Log AI usage
        prompt_tokens, completion_tokens = extract_usage_from_gemini_response(response)
        log_ai_usage(db, current_user.id, "graph_action", GEMINI_MODEL, prompt_tokens, completion_tokens)

        # Parse JSON response
        try:
            text = clean_json_response(response.text)
            data = json.loads(text, strict=False)
            return AiGraphActionResponse(**data)
        except Exception as e:
            logger.error("Failed to parse AI JSON response", error=str(e), text=response.text)
            raise HTTPException(status_code=500, detail="AI returned invalid JSON")

    except Exception as e:
        logger.error("AI Graph Action failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"AI Graph Action failed: {str(e)}")
