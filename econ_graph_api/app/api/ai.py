from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
import google.generativeai as genai
import json
import uuid
import asyncio
import io
import pypdf
from datetime import datetime
from sse_starlette.sse import EventSourceResponse
from app.core.config import settings
from app.core.logging import get_logger
from app.core.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/ai", tags=["ai"])
logger = get_logger(__name__)


class NodeInputContext(BaseModel):
    id: str
    label: str | None = None
    unit: str | None = None
    description: str | None = None

class AiGenerationContext(BaseModel):
    label: str | None = None
    unit: str | None = None
    description: str | None = None
    inputs: list[NodeInputContext] = []
    # Optional: nodeId if editing an existing node
    nodeId: str | None = None
    # Optional: existing code to modify
    currentCode: str | None = None

class AiGenerationRequest(BaseModel):
    prompt: str
    context: AiGenerationContext

class AiGenerationResponse(BaseModel):
    text: str

@router.post("/generate", response_model=AiGenerationResponse)
async def generate_code(request: AiGenerationRequest):
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    try:
        genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')

        system_prompt = """
        You are an expert Python coding assistant for the "Econ Graph" application.
        Your goal is to write short, efficient Python code snippets for node computation.
        
        CONTEXT:
        - The user is editing a "compute" function for a node in a graph.
        - The function signature MUST be: def compute(var1, var2, ...):
        - IMPORTANT: The function arguments MUST ONLY include the variables that are ACTUALLY USED in the function body. Do not include unused variables.
        - The function MUST return a number (float or int).
        - Available variables (inputs) are provided in the context with their units and descriptions.
        - Use the variable units to perform necessary conversions if implied by the user prompt.
        - NO imports are allowed (except standard math module if needed, but prefer built-ins).
        - Keep it concise.
        
        INPUT CONTEXT:
        {context}
        
        INSTRUCTIONS:
        - If 'currentCode' is provided in the context, it means the user wants to MODIFY the existing code.
          - Apply the changes requested in the prompt to the 'currentCode'.
          - Fix errors if the prompt asks for it.
          - Keep the rest of the logic if it's not related to the change.
        - If 'currentCode' is empty or not provided, generate new code from scratch.
        - Return ONLY the Python code.
        - Do not wrap in markdown code blocks (unless requested).
        - Start with a comment describing what the code does (e.g., "# Modèle : Moyenne pondérée").
        - Ensure the code is valid Python.
        - Use the exact variable IDs provided in the context.
        """.format(context=request.context.model_dump_json(indent=2))

        response = model.generate_content(
            contents=[
                {"role": "user", "parts": [system_prompt + "\n\nUser Prompt: " + request.prompt]}
            ],
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
            )
        )

        text = response.text
        # Clean up markdown code blocks if present
        if text.startswith("```python"):
            text = text[9:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        return AiGenerationResponse(text=text.strip())

    except Exception as e:
        logger.error("AI Generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"AI Generation failed: {str(e)}")

# --- Graph Action Models ---

class AiNodeDefinition(BaseModel):
    id: str # Temporary ID for linking within the generation (e.g. "node1") OR real ID if updating/deleting
    label: str | None = None
    slug: str | None = None # CRITICAL: The actual slug of the node (for code references)
    type: str | None = None # "computed", "parameter", "composite"
    action: str = "create" # "create", "update", "delete"
    unit: str | None = None
    description: str | None = None
    # For computed nodes
    code: str | None = None
    inputs: list[str] = [] # List of IDs (temp or real)
    # For parameter nodes
    value: float | None = None
    # Positioning
    pos_x: float | None = None
    pos_y: float | None = None
    composite_id: str | None = None

class AiScenarioOverride(BaseModel):
    node_id: str
    mode: str = "value" # "value" or "formula"
    value: float | None = None
    code: str | None = None

class AiScenarioDefinition(BaseModel):
    id: str | None = None # Temporary ID (e.g. "s1") or real ID
    name: str
    action: str = "create" # "create", "update", "delete"
    overrides: list[AiScenarioOverride] = []

class AiCompositeDefinition(BaseModel):
    id: str
    name: str
    description: str | None = None
    input_slugs: list[str] = []

class AiGraphActionRequest(BaseModel):
    prompt: str
    context: str | None = None # e.g. "dashboard" or "new_project"
    current_nodes: list[AiNodeDefinition] = [] # Existing nodes context
    current_scenarios: list[AiScenarioDefinition] = [] # Existing scenarios context
    focus_node_ids: list[str] = [] # IDs of nodes selected by the user
    available_composites: list[AiCompositeDefinition] = [] # Composites available in library

class AiGraphActionResponse(BaseModel):
    project_name: str | None = None
    project_description: str | None = None
    composite_name: str | None = None
    composite_description: str | None = None
    nodes: list[AiNodeDefinition]
    scenarios: list[AiScenarioDefinition] = []
    explanation: str | None = None

class SmartFixRequest(BaseModel):
    node_id: str
    current_code: str
    error_trace: str
    # Optional: graph context could be added here if needed

class SmartFixResponse(BaseModel):
    corrected_code: str
    explanation: str
    confidence_score: float | None = None

@router.post("/smart-fix", response_model=SmartFixResponse)
async def smart_fix(request: SmartFixRequest):
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    try:
        genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')

        system_prompt = """
        You are an expert Python debugger for the "Econ Graph" application.
        Your goal is to fix a specific Python error in a node's computation code.

        CONTEXT:
        - The user has written a Python function `def compute(...)`.
        - It failed with an error during execution.
        - You must analyze the code and the error trace to propose a FIX.

        INPUT:
        - Current Code:
        {current_code}

        - Error Trace:
        {error_trace}

        INSTRUCTIONS:
        1. Analyze why the code failed based on the error.
        2. Propose a CORRECTED version of the code.
           - It must be a valid Python function `def compute(...)`.
           - It must fix the specific error reported.
           - It should be robust (e.g., handle division by zero if that was the issue).
        3. Provide a short, educational EXPLANATION of the fix.
           - Explain what was wrong and how you fixed it.
           - Be concise and helpful.

        OUTPUT FORMAT (JSON):
        {{
            "corrected_code": "def compute(...): ...",
            "explanation": "I fixed the ZeroDivisionError by adding a check...",
            "confidence_score": 0.95
        }}
        """

        response = model.generate_content(
            contents=[
                {"role": "user", "parts": [system_prompt.format(
                    current_code=request.current_code,
                    error_trace=request.error_trace
                )]}
            ],
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )

        try:
            data = json.loads(response.text)
            return SmartFixResponse(**data)
        except Exception as e:
            logger.error("Failed to parse Smart Fix JSON response", error=str(e), text=response.text)
            # Fallback if JSON parsing fails but we have text? 
            # For now, let's assume the model follows instructions well with JSON mode.
            raise HTTPException(status_code=500, detail="AI returned invalid JSON for Smart Fix")

    except Exception as e:
        logger.error("Smart Fix failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Smart Fix failed: {str(e)}")


@router.post("/graph-action", response_model=AiGraphActionResponse)
async def generate_graph_action(request: AiGraphActionRequest):
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    try:
        genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')

        # Determine context-specific instructions
        context_instructions = ""
        if request.context == 'composite_modification':
            context_instructions = """
        CONTEXT: COMPOSITE EDITOR (REUSABLE TEMPLATE)
        - You are editing a reusable Composite Node template.
        - **FORBIDDEN**: Do NOT create projects. Do NOT return "project_name" or "project_description".
        - **GOAL**: Create a self-contained calculation flow.
        - **INPUTS**: Nodes you create with NO incoming edges (Parameters) will become the composite's INPUTS.
        - **OUTPUTS**: Leaf nodes (no outgoing edges) will become the composite's OUTPUTS.
        - **LAYOUT**: Keep the same Top-to-Bottom flow (Inputs at y=0, Calculations at y=250, Outputs at y=500).
            """
        elif request.context == 'new_composite':
            context_instructions = """
        CONTEXT: NEW COMPOSITE CREATION
        - The user wants to create a NEW reusable Composite Node template from scratch.
        - **MANDATORY**: You MUST provide a "composite_name" and "composite_description".
        - **FORBIDDEN**: Do NOT create projects. Do NOT return "project_name".
        - **GOAL**: Create a self-contained calculation flow.
        - **INPUTS**: Nodes you create with NO incoming edges (Parameters) will become the composite's INPUTS.
        - **OUTPUTS**: Leaf nodes (no outgoing edges) will become the composite's OUTPUTS.
        - **LAYOUT**: Keep the same Top-to-Bottom flow (Inputs at y=0, Calculations at y=250, Outputs at y=500).
            """
        elif request.context == 'refactoring':
            context_instructions = """
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
            context_instructions = """
        CONTEXT: PROJECT EDITOR
        - The user wants to build a model or a calculation flow.
        - If the user asks to create a NEW project or model (e.g. "Create a Real Estate model"), OR if the context is "new_project", you MUST provide a "project_name" and "project_description".
        - If the user just asks to add nodes to the current graph, leave "project_name" null.
            """

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

        system_prompt = """
        You are an expert Graph Architect for the "Econ Graph" application.
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
        """.format(
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

        # Parse JSON response
        try:
            data = json.loads(response.text)
            return AiGraphActionResponse(**data)
        except Exception as e:
            logger.error("Failed to parse AI JSON response", error=str(e), text=response.text)
            raise HTTPException(status_code=500, detail="AI returned invalid JSON")

    except Exception as e:
        logger.error("AI Graph Action failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"AI Graph Action failed: {str(e)}")


# ==================== MULTI-AGENT PROJECT CREATION ====================

# Store des queues de logs pour chaque tâche (en mémoire pour simplifier)
log_queues: dict[str, asyncio.Queue] = {}


class AgentProjectCreateRequest(BaseModel):
    prompt: str


class AgentProjectCreateResponse(BaseModel):
    task_id: str
    message: str


async def run_agent_pipeline_background(task_id: str, prompt: str, user_id: str):
    """Execute le pipeline en background et stream les logs"""
    from app.services.agent_pipeline import agent_graph, PipelineState

    queue = log_queues.get(task_id)
    if not queue:
        return

    try:
        # 1. Log immédiat : Démarrage
        await queue.put({
            "type": "log",
            "level": "info",
            "message": "🚀 Démarrage du système...",
            "step": "init",
            "timestamp": datetime.utcnow().isoformat()
        })

        # 2. Log avant l'import lourd (Cold Start)
        await queue.put({
            "type": "log",
            "level": "info",
            "message": "📦 Chargement des modules IA et compilation du graphe...",
            "step": "init",
            "timestamp": datetime.utcnow().isoformat()
        })

        # Force flush logs before blocking import
        await asyncio.sleep(0.1)

        # L'import est ici et prend du temps au premier lancement
        from app.services.agent_pipeline import agent_graph, PipelineState

        # 3. Log après l'import, avant l'exécution
        await queue.put({
            "type": "log",
            "level": "info",
            "message": "🤖 Initialisation des agents terminée. Analyse en cours...",
            "step": "init",
            "timestamp": datetime.utcnow().isoformat()
        })

        # État initial
        initial_state: PipelineState = {
            "prompt": prompt,
            "user_id": user_id,
            "analyzed_structure": None,
            "execution_plan": None,
            "project_id": None,
            "created_nodes": {},
            "errors": [],
            "retry_count": 0,
            "logs": [],
            "status": "initializing"
        }

        await queue.put({
            "type": "start",
            "message": "Pipeline multi-agents démarré",
            "timestamp": datetime.utcnow().isoformat()
        })

        # Exécuter le graphe LangGraph
        final_state = None
        last_log_index = 0  # Optimization: track index instead of full set scan

        async for state_update in agent_graph.astream(initial_state):
            # state_update est un dict avec le nom du nœud comme clé
            node_name = list(state_update.keys())[0]
            current_state = state_update[node_name]

            # Stream seulement les NOUVEAUX logs
            all_logs = current_state.get("logs", [])
            
            # Optimization: slice the list to get only new logs
            new_logs = all_logs[last_log_index:]
            
            for log in new_logs:
                await queue.put(log)
            
            last_log_index = len(all_logs)

        # Extraire l'état final
        if state_update:
            node_name = list(state_update.keys())[-1]
            final_state = state_update[node_name]

        # Message de complétion
        if final_state and final_state.get("status") == "success":
            await queue.put({
                "type": "complete",
                "status": "success",
                "project_id": final_state.get("project_id"),
                "message": "✓ Projet créé avec succès !"
            })
        else:
            await queue.put({
                "type": "complete",
                "status": "error",
                "message": "✗ Échec de la création du projet",
                "errors": final_state.get("errors", []) if final_state else []
            })

    except Exception as e:
        await queue.put({
            "type": "error",
            "message": f"Erreur critique: {str(e)}"
        })
        await queue.put({
            "type": "complete",
            "status": "error",
            "message": str(e)
        })

    finally:
        # Garder la queue 5 minutes pour permettre la reconnexion
        await asyncio.sleep(300)
        if task_id in log_queues:
            del log_queues[task_id]


@router.post("/agent-project-create", response_model=AgentProjectCreateResponse)
async def agent_project_create(
    background_tasks: BackgroundTasks,
    prompt: str = Form(...),
    file: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user)
):
    """
    Crée un projet complet via le pipeline multi-agents.
    Retourne un task_id pour suivre la progression via SSE.
    """
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    # Handle file upload if present
    full_prompt = prompt
    if file:
        try:
            content = await file.read()
            file_text = ""
            
            if file.filename.lower().endswith('.pdf'):
                pdf_reader = pypdf.PdfReader(io.BytesIO(content))
                for page in pdf_reader.pages:
                    file_text += page.extract_text() + "\n"
            else:
                # Assume text file
                try:
                    file_text = content.decode('utf-8')
                except UnicodeDecodeError:
                    # Fallback for other encodings if needed, or just skip
                    file_text = "[Contenu binaire ou encodage non supporté]"
            
            full_prompt += f"\n\n[CONTEXTE DU FICHIER JOINT ({file.filename})]:\n{file_text}"
            
        except Exception as e:
            logger.error(f"Failed to process uploaded file: {str(e)}")
            full_prompt += f"\n\n[ERREUR]: Impossible de lire le fichier joint {file.filename}."

    task_id = str(uuid.uuid4())
    log_queues[task_id] = asyncio.Queue()

    # Lancer le pipeline en background
    background_tasks.add_task(
        run_agent_pipeline_background,
        task_id=task_id,
        prompt=full_prompt,
        user_id=current_user.id
    )

    return AgentProjectCreateResponse(
        task_id=task_id,
        message="Pipeline multi-agents démarré. Connectez-vous au stream SSE."
    )


@router.get("/agent-status/{task_id}")
async def agent_status_stream(task_id: str):
    """
    Stream SSE des logs du pipeline multi-agents.
    """
    queue = log_queues.get(task_id)

    if not queue:
        raise HTTPException(status_code=404, detail="Task not found or expired")

    async def event_generator():
        try:
            while True:
                # Attendre un log (timeout de 30s pour heartbeat)
                try:
                    log = await asyncio.wait_for(queue.get(), timeout=30.0)

                    # Envoyer le log au client
                    yield {
                        "event": "message",
                        "data": json.dumps(log, ensure_ascii=False)
                    }

                    # Si c'est un message de complétion, terminer
                    if log.get("type") == "complete":
                        break

                except asyncio.TimeoutError:
                    # Heartbeat pour maintenir la connexion
                    yield {
                        "event": "heartbeat",
                        "data": json.dumps({"status": "alive"})
                    }

        except asyncio.CancelledError:
            # Client déconnecté
            pass

    return EventSourceResponse(event_generator())
