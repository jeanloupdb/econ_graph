"""
AI Code Generation endpoints.

Endpoints:
- POST /generate: Generate Python code for a node computation
- POST /create-node: Create a complete node with AI-generated code
- POST /smart-fix: Fix errors in node computation code
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import google.generativeai as genai
import json
import re
import unicodedata

from app.core.config import settings
from app.core.logging import get_logger
from app.core.deps import get_current_user
from app.core.db import get_db
from app.models import User
from app.services.ai_usage import log_ai_usage, extract_usage_from_gemini_response

from .shared import (
    GEMINI_MODEL, 
    AiGenerationContext,
    configure_gemini, 
    clean_json_response, 
    clean_code_response,
    remove_import_statements,
    build_graph_context_info,
)

router = APIRouter()
logger = get_logger(__name__)


# ==================== REQUEST/RESPONSE MODELS ====================

class AiGenerationRequest(BaseModel):
    prompt: str
    context: AiGenerationContext


class AiGenerationResponse(BaseModel):
    text: str


class AiCreateNodeRequest(BaseModel):
    prompt: str
    project_id: str
    context: AiGenerationContext


class AiCreateNodeResponse(BaseModel):
    node_id: str
    label: str
    slug: str
    code: str
    message: str


class SmartFixRequest(BaseModel):
    node_id: str
    current_code: str
    error_trace: str


class SmartFixResponse(BaseModel):
    corrected_code: str
    explanation: str
    confidence_score: float | None = None


# ==================== PROMPTS ====================

CODE_GENERATION_PROMPT = """
You are an expert Python coding assistant for the "Smart Graph" application.
Your goal is to write short, efficient Python code snippets for node computation.

CONTEXT:
- The user is editing a "compute" function for a node in a graph.
- The function signature MUST be: def compute(var1, var2, ...):
- IMPORTANT: The function arguments MUST ONLY include the variables that are ACTUALLY USED in the function body. Do not include unused variables.
- The function MUST return a number (float or int).
- Available variables (inputs) are provided in the context with their units and descriptions.
- Use the variable units to perform necessary conversions if implied by the user prompt.
- Keep it concise.
{graph_context}

CRITICAL PYTHON RULES:
- **FORBIDDEN**: `import` statements. NO imports allowed (not even `import math`).
- The `math` module is ALREADY available without import. Use `math.sqrt(x)`, `math.log(x)`, etc. directly.
- For square root: use `x ** 0.5` OR `math.sqrt(x)` (NO import needed)
- For power: use `x ** n` OR `math.pow(x, n)` (NO import needed)
- Available math functions (no import): sqrt, pow, exp, log, log10, sin, cos, tan, floor, ceil, abs, min, max, round
- The function MUST return a numeric value (int or float). NEVER return None or null.

INPUT CONTEXT:
{context}

INSTRUCTIONS:
- If 'currentCode' is provided in the context, it means the user wants to MODIFY the existing code.
  - Apply the changes requested in the prompt to the 'currentCode'.
  - Fix errors if the prompt asks for it.
  - Keep the rest of the logic if it's not related to the change.
- If 'currentCode' is empty or not provided, generate new code from scratch.
- Use the FULL GRAPH CONTEXT above to understand the available variables and their relationships.
- Reference nodes by their SLUG (e.g., 'revenue', 'cost', 'tax_rate') in the function arguments.
- Return ONLY the Python code.
- Do not wrap in markdown code blocks (unless requested).
- Start with a comment describing what the code does (e.g., "# Modèle : Moyenne pondérée").
- Ensure the code is valid Python.
- Use the exact variable IDs/slugs provided in the context.
"""

CREATE_NODE_PROMPT = """
You are an expert Python coding assistant for creating nodes in "Smart Graph".
Your goal is to generate a COMPLETE node definition including label, code, and unit.

CONTEXT:
- You are creating a NEW node from scratch based on the user's prompt.
- The function signature MUST be: def compute(var1, var2, ...):
- The function arguments MUST ONLY include the variables that are ACTUALLY USED.
- The function MUST return a number (float or int).
- Available variables (inputs) are provided in the context.
{graph_context}

INPUT CONTEXT:
{context}

INSTRUCTIONS:
1. EXTRACT a clear, concise LABEL from the user prompt (e.g., "Chiffre d'affaires", "Profit margin")
2. DETERMINE the appropriate UNIT (e.g., "€", "%", "units", or leave empty)
3. GENERATE the Python code for the compute function
4. Return ONLY valid JSON with this structure:
{{
    "label": "Revenue",
    "unit": "€",
    "code": "def compute(price, quantity):\\n    return price * quantity",
    "description": "Total revenue from sales"
}}

CRITICAL PYTHON RULES:
- **FORBIDDEN**: `import` statements. NO imports allowed (not even `import math`).
- The `math` module is ALREADY available without import. Use `math.sqrt(x)`, `math.log(x)`, etc. directly.
- For square root: use `x ** 0.5` OR `math.sqrt(x)` (NO import needed)
- For power: use `x ** n` OR `math.pow(x, n)` (NO import needed)
- Available math functions (no import): sqrt, pow, exp, log, log10, sin, cos, tan, floor, ceil, abs, min, max, round
- The function MUST return a numeric value (int or float). NEVER return None or null.

OTHER RULES:
- Use the EXACT variable IDs/slugs from the context
- Start code with a comment describing the calculation
- NO markdown code blocks
- Return ONLY the JSON object
"""

SMART_FIX_PROMPT = """
You are an expert Python debugger for the "Smart Graph" application.
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


# ==================== ENDPOINTS ====================

@router.post("/generate", response_model=AiGenerationResponse)
async def generate_code(
    request: AiGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate Python code for a node computation based on user prompt."""
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    try:
        configure_gemini()
        model = genai.GenerativeModel(GEMINI_MODEL)

        graph_context_info = build_graph_context_info(request.context.graphContext)

        system_prompt = CODE_GENERATION_PROMPT.format(
            context=request.context.model_dump_json(indent=2),
            graph_context=graph_context_info
        )

        response = model.generate_content(
            contents=[
                {"role": "user", "parts": [system_prompt + "\n\nUser Prompt: " + request.prompt]}
            ],
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
            )
        )

        # Log AI usage
        prompt_tokens, completion_tokens = extract_usage_from_gemini_response(response)
        log_ai_usage(db, current_user.id, "generate_code", GEMINI_MODEL, prompt_tokens, completion_tokens)

        text = clean_code_response(response.text)
        text = remove_import_statements(text)
            
        return AiGenerationResponse(text=text)

    except Exception as e:
        logger.error("AI Generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"AI Generation failed: {str(e)}")


@router.post("/create-node", response_model=AiCreateNodeResponse)
async def create_node_with_ai(
    request: AiCreateNodeRequest, 
    current_user: User = Depends(get_current_user)
):
    """
    Create a complete node via AI: generates code, extracts label, computes slug,
    creates the node in the database, and computes it.
    """
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    try:
        from app.schemas import NodeCreate

        logger.info("Starting AI node creation", prompt=request.prompt[:100])

        configure_gemini()
        model = genai.GenerativeModel(GEMINI_MODEL)

        graph_context_info = build_graph_context_info(request.context.graphContext)

        system_prompt = CREATE_NODE_PROMPT.format(
            context=request.context.model_dump_json(indent=2),
            graph_context=graph_context_info
        )

        response = model.generate_content(
            contents=[
                {"role": "user", "parts": [system_prompt + "\n\nUser Prompt: " + request.prompt]}
            ],
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                response_mime_type="application/json"
            )
        )

        # Log AI usage
        prompt_tokens, completion_tokens = extract_usage_from_gemini_response(response)
        
        # Parse AI response
        text = clean_json_response(response.text)
        ai_data = json.loads(text, strict=False)
        
        label = ai_data.get("label", "Nouveau nœud")
        unit = ai_data.get("unit", "")
        code = ai_data.get("code", "def compute():\n    return 0")
        description = ai_data.get("description", "")

        logger.info("AI data parsed", label=label, unit=unit)

        # Clean up code
        code = clean_code_response(code)
        code = remove_import_statements(code)
        
        # Verify no imports remain
        if re.search(r'^\s*(import |from .+ import )', code, re.MULTILINE):
            logger.error("Code still contains import statements after cleanup")
            raise HTTPException(
                status_code=400, 
                detail="Le code généré contient des imports interdits. Veuillez reformuler votre demande."
            )

        # Generate slug from label
        def kebabify(s: str) -> str:
            normalized = unicodedata.normalize('NFD', s)
            ascii_str = normalized.encode('ascii', 'ignore').decode('ascii')
            slug = ascii_str.lower().replace(' ', '_').replace('-', '_').replace("'", '').replace('"', '')
            slug = ''.join(c for c in slug if c.isalnum() or c == '_')
            return slug.strip('_')[:60]

        slug = kebabify(label)
        logger.info("Slug generated", slug=slug)

        # Create the node via repository
        from app.core.db import SessionLocal
        from app.repositories import node_repo
        from app.repositories.edge_repo import EdgeRepository
        from app.schemas.edge import EdgeCreate
        from app.models.project import Project
        from app.models.node import Node
        import ast

        db = SessionLocal()
        try:
            # Log AI usage
            log_ai_usage(db, current_user.id, "create_node", GEMINI_MODEL, prompt_tokens, completion_tokens)

            # Verify project ownership
            project = db.query(Project).filter(Project.id == request.project_id).first()
            if not project or project.user_id != current_user.id:
                raise HTTPException(status_code=404, detail="Project not found")

            node_data = NodeCreate(
                slug=slug,
                label=label,
                unit=unit,
                status="unknown",
                confidence=0.5,
                notes=description or None,
                value_computed=None,
                computation_definition=code,
                project_id=request.project_id
            )

            new_node = node_repo.create(db, node_data, project_id=request.project_id)
            logger.info("Node created in DB", node_id=new_node.id)

            # Extract dependencies from code and create edges
            try:
                tree = ast.parse(code)
                func_def = None
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef) and node.name == 'compute':
                        func_def = node
                        break

                if func_def and func_def.args.args:
                    param_names = [arg.arg for arg in func_def.args.args]
                    logger.info("Extracted parameters from code", params=param_names)

                    if request.context.graphContext and request.context.graphContext.availableNodes:
                        nodes_by_slug = {n.slug: n.id for n in request.context.graphContext.availableNodes if n.slug}

                        for param in param_names:
                            if param in nodes_by_slug:
                                source_node_id = nodes_by_slug[param]
                                edge_id = f"{source_node_id}-{new_node.id}"

                                edge_data = EdgeCreate(
                                    id=edge_id,
                                    source=source_node_id,
                                    target=new_node.id,
                                    label=param,
                                    edge_type="dependency",
                                    project_id=request.project_id
                                )
                                EdgeRepository.create(db, edge_data, project_id=request.project_id)
                                logger.info("Edge created", source=source_node_id, target=new_node.id, param=param)
                            else:
                                logger.warning("No matching node found for parameter", param=param)

            except Exception as e:
                logger.warning("Failed to create edges from dependencies", error=str(e))

            # Compute ALL nodes in the project
            from app.services.computation import compute_all_nodes
            try:
                logger.info("Starting full project computation after node creation", node_id=new_node.id)
                compute_all_nodes(db, project_id=request.project_id)
                db.commit()
                logger.info("Project computed successfully after node creation")
            except Exception as e:
                logger.warning(f"Node created but computation failed: {str(e)}")
                db.commit()

            return AiCreateNodeResponse(
                node_id=new_node.id,
                label=label,
                slug=slug,
                code=code,
                message=f"Nœud '{label}' créé avec succès"
            )

        finally:
            db.close()

    except Exception as e:
        logger.error("AI Create Node failed", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI Create Node failed: {str(e)}")


@router.post("/smart-fix", response_model=SmartFixResponse)
async def smart_fix(
    request: SmartFixRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fix errors in node computation code using AI."""
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    try:
        configure_gemini()
        model = genai.GenerativeModel(GEMINI_MODEL)

        system_prompt = SMART_FIX_PROMPT.format(
            current_code=request.current_code,
            error_trace=request.error_trace
        )

        response = model.generate_content(
            contents=[
                {"role": "user", "parts": [system_prompt]}
            ],
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )

        # Log AI usage
        prompt_tokens, completion_tokens = extract_usage_from_gemini_response(response)
        log_ai_usage(db, current_user.id, "smart_fix", GEMINI_MODEL, prompt_tokens, completion_tokens)

        try:
            text = clean_json_response(response.text)
            data = json.loads(text, strict=False)
            return SmartFixResponse(**data)
        except Exception as e:
            logger.error("Failed to parse Smart Fix JSON response", error=str(e), text=response.text)
            raise HTTPException(status_code=500, detail="AI returned invalid JSON for Smart Fix")

    except Exception as e:
        logger.error("Smart Fix failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Smart Fix failed: {str(e)}")
