"""
Project Chat endpoint with function calling.

Provides a conversational AI interface for each project.
The AI can actually modify the graph using function calls.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import google.generativeai as genai
from google.generativeai.types import FunctionDeclaration, Tool
import json
import uuid
import re
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.core.deps import get_current_user
from app.core.db import get_db
from app.models import User, Project, Node, Scenario, Edge
from app.models.project_conversation import ProjectConversation, ConversationMessage
from app.schemas.project_chat import (
    ChatMessageCreate, ChatMessageOut, ConversationOut, ChatResponse
)
from app.services.ai_usage import log_ai_usage, extract_usage_from_gemini_response
from app.services.dependency_tracker import invalidate_dependency_graph

from .shared import GEMINI_MODEL, configure_gemini

router = APIRouter()
logger = get_logger(__name__)


# ==================== CONSTANTS ====================

MAX_CONTEXT_MESSAGES = 20
MAX_NODES_IN_CONTEXT = 50


# ==================== TOOL DEFINITIONS ====================

GRAPH_TOOLS = Tool(function_declarations=[
    FunctionDeclaration(
        name="update_node_formula",
        description="Met à jour la formule de calcul d'un nœud. Utilise cette fonction quand l'utilisateur demande de modifier une formule ou de corriger un cycle.",
        parameters={
            "type": "object",
            "properties": {
                "node_slug": {
                    "type": "string",
                    "description": "Le slug (identifiant) du nœud à modifier"
                },
                "new_inputs": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Liste des slugs des nœuds dont ce nœud dépend (ses inputs)"
                },
                "new_formula": {
                    "type": "string",
                    "description": "La nouvelle formule Python (ex: 'budget * taux' ou 'max(0, revenu - cout)')"
                }
            },
            "required": ["node_slug", "new_inputs", "new_formula"]
        }
    ),
    FunctionDeclaration(
        name="convert_to_parameter",
        description="Convertit un nœud calculé en paramètre avec une valeur fixe. Utile pour briser les cycles en fixant une valeur.",
        parameters={
            "type": "object",
            "properties": {
                "node_slug": {
                    "type": "string",
                    "description": "Le slug du nœud à convertir en paramètre"
                },
                "fixed_value": {
                    "type": "number",
                    "description": "La valeur fixe à assigner au paramètre"
                }
            },
            "required": ["node_slug", "fixed_value"]
        }
    ),
    FunctionDeclaration(
        name="delete_edge",
        description="Supprime une dépendance (edge) entre deux nœuds pour briser un cycle.",
        parameters={
            "type": "object",
            "properties": {
                "source_slug": {
                    "type": "string",
                    "description": "Le slug du nœud source (dont on dépend)"
                },
                "target_slug": {
                    "type": "string",
                    "description": "Le slug du nœud cible (qui dépend de la source)"
                }
            },
            "required": ["source_slug", "target_slug"]
        }
    ),
    FunctionDeclaration(
        name="get_node_details",
        description="Récupère les détails complets d'un nœud incluant sa formule actuelle et ses dépendances.",
        parameters={
            "type": "object",
            "properties": {
                "node_slug": {
                    "type": "string",
                    "description": "Le slug du nœud à examiner"
                }
            },
            "required": ["node_slug"]
        }
    ),
    FunctionDeclaration(
        name="detect_cycles",
        description="Détecte les cycles dans le graphe et retourne les nœuds impliqués.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    ),
])


# ==================== TOOL IMPLEMENTATIONS ====================

def execute_tool(tool_name: str, args: dict, db: Session, project_id: str, nodes_map: dict) -> dict:
    """Execute a tool and return the result."""

    if tool_name == "update_node_formula":
        return _update_node_formula(db, project_id, nodes_map, args)
    elif tool_name == "convert_to_parameter":
        return _convert_to_parameter(db, project_id, nodes_map, args)
    elif tool_name == "delete_edge":
        return _delete_edge(db, project_id, nodes_map, args)
    elif tool_name == "get_node_details":
        return _get_node_details(db, project_id, nodes_map, args)
    elif tool_name == "detect_cycles":
        return _detect_cycles(db, project_id, nodes_map)
    else:
        return {"error": f"Unknown tool: {tool_name}"}


def _update_node_formula(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    """Update a node's formula."""
    slug = args.get("node_slug")
    new_inputs = args.get("new_inputs", [])
    new_formula = args.get("new_formula", "0")

    node = nodes_map.get(slug)
    if not node:
        return {"success": False, "error": f"Nœud '{slug}' non trouvé"}

    # Generate new computation_definition
    args_str = ", ".join(new_inputs) if new_inputs else ""
    new_definition = f"def compute({args_str}):\n    return {new_formula}"

    # Update node
    node.computation_definition = new_definition
    node.status = "implied"  # It's now a computed node

    # Update edges: delete old incoming edges, create new ones
    db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.target == node.id,
        Edge.edge_type == "dependency"
    ).delete()

    # Create new edges
    for input_slug in new_inputs:
        source_node = nodes_map.get(input_slug)
        if source_node:
            edge = Edge(
                id=str(uuid.uuid4()),
                project_id=project_id,
                source=source_node.id,
                target=node.id,
                edge_type="dependency"
            )
            db.add(edge)

    db.flush()
    invalidate_dependency_graph(project_id)

    return {
        "success": True,
        "message": f"Formule de '{node.label}' mise à jour avec inputs {new_inputs}"
    }


def _convert_to_parameter(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    """Convert a computed node to a parameter."""
    slug = args.get("node_slug")
    fixed_value = args.get("fixed_value", 0)

    node = nodes_map.get(slug)
    if not node:
        return {"success": False, "error": f"Nœud '{slug}' non trouvé"}

    # Update node to be a parameter
    node.computation_definition = f"def compute():\n    return {fixed_value}"
    node.status = "imposed"
    node.value_computed = fixed_value

    # Delete all incoming edges (this node no longer depends on anything)
    db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.target == node.id,
        Edge.edge_type == "dependency"
    ).delete()

    db.flush()
    invalidate_dependency_graph(project_id)

    return {
        "success": True,
        "message": f"'{node.label}' converti en paramètre avec valeur {fixed_value}"
    }


def _delete_edge(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    """Delete an edge between two nodes."""
    source_slug = args.get("source_slug")
    target_slug = args.get("target_slug")

    source_node = nodes_map.get(source_slug)
    target_node = nodes_map.get(target_slug)

    if not source_node:
        return {"success": False, "error": f"Nœud source '{source_slug}' non trouvé"}
    if not target_node:
        return {"success": False, "error": f"Nœud cible '{target_slug}' non trouvé"}

    # Delete the edge
    deleted = db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.source == source_node.id,
        Edge.target == target_node.id,
        Edge.edge_type == "dependency"
    ).delete()

    if deleted == 0:
        return {"success": False, "error": f"Aucune dépendance trouvée de '{source_slug}' vers '{target_slug}'"}

    # Also need to update the target node's computation_definition to remove the input
    if target_node.computation_definition:
        # Extract current inputs from def compute(a, b, c):
        match = re.search(r"def\s+compute\s*\(([^)]*)\)\s*:", target_node.computation_definition)
        if match:
            current_inputs = [p.strip() for p in match.group(1).split(",") if p.strip()]
            if source_slug in current_inputs:
                current_inputs.remove(source_slug)
                # Rebuild the definition
                args_str = ", ".join(current_inputs)
                # Keep the return part
                return_match = re.search(r"return\s+(.+)", target_node.computation_definition)
                if return_match:
                    formula = return_match.group(1).strip()
                    target_node.computation_definition = f"def compute({args_str}):\n    return {formula}"

    db.flush()
    invalidate_dependency_graph(project_id)

    return {
        "success": True,
        "message": f"Dépendance supprimée: '{target_slug}' ne dépend plus de '{source_slug}'"
    }


def _get_node_details(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    """Get detailed information about a node."""
    slug = args.get("node_slug")

    node = nodes_map.get(slug)
    if not node:
        return {"error": f"Nœud '{slug}' non trouvé"}

    # Get edges
    incoming_edges = db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.target == node.id,
        Edge.edge_type == "dependency"
    ).all()

    outgoing_edges = db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.source == node.id,
        Edge.edge_type == "dependency"
    ).all()

    # Map IDs to slugs
    id_to_slug = {n.id: n.slug for n in nodes_map.values()}

    return {
        "slug": node.slug,
        "label": node.label,
        "type": "paramètre" if node.status == "imposed" else "calculé",
        "value": node.value_computed,
        "unit": node.unit,
        "formula": node.computation_definition,
        "inputs": [id_to_slug.get(e.source, e.source) for e in incoming_edges],
        "outputs": [id_to_slug.get(e.target, e.target) for e in outgoing_edges],
        "error": node.computation_error
    }


def _detect_cycles(db: Session, project_id: str, nodes_map: dict) -> dict:
    """Detect cycles in the graph."""
    # Build adjacency list from edges
    edges = db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.edge_type == "dependency"
    ).all()

    id_to_slug = {n.id: n.slug for n in nodes_map.values()}

    # Dependencies: target depends on source
    dependencies = {}
    for edge in edges:
        target_slug = id_to_slug.get(edge.target)
        source_slug = id_to_slug.get(edge.source)
        if target_slug and source_slug:
            if target_slug not in dependencies:
                dependencies[target_slug] = []
            dependencies[target_slug].append(source_slug)

    # DFS to detect cycles
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {slug: WHITE for slug in nodes_map.keys()}
    cycles = []

    def dfs(node, path):
        color[node] = GRAY
        for dep in dependencies.get(node, []):
            if dep not in color:
                continue
            if color[dep] == GRAY:
                # Found cycle
                cycle_start = path.index(dep)
                cycle = path[cycle_start:] + [dep]
                cycles.append(cycle)
            elif color[dep] == WHITE:
                dfs(dep, path + [dep])
        color[node] = BLACK

    for node in nodes_map.keys():
        if color[node] == WHITE:
            dfs(node, [node])

    if cycles:
        return {
            "has_cycles": True,
            "cycles": cycles,
            "message": f"Cycles détectés: {cycles}"
        }
    return {
        "has_cycles": False,
        "message": "Aucun cycle détecté"
    }


# ==================== SYSTEM PROMPT ====================

PROJECT_CHAT_SYSTEM_PROMPT = """Tu es l'assistant IA du projet "{project_name}" dans SmartGraph.
Tu peux MODIFIER le graphe en utilisant les outils disponibles.

## CONTEXTE DU PROJET

**Nom:** {project_name}
**Nœuds ({node_count}):**
{nodes_context}

## TES OUTILS

Tu as accès à ces outils pour modifier le graphe :

1. **update_node_formula** - Modifie la formule d'un nœud
2. **convert_to_parameter** - Convertit un nœud en paramètre fixe
3. **delete_edge** - Supprime une dépendance entre nœuds
4. **get_node_details** - Obtient les détails d'un nœud
5. **detect_cycles** - Détecte les cycles dans le graphe

## RÈGLES IMPORTANTES

- UTILISE les outils quand l'utilisateur demande une modification
- Sois CONCIS (2-3 phrases max)
- Quand tu corriges un cycle, UTILISE l'outil approprié
- Après une action, confirme simplement ce qui a été fait
- Langue: réponds dans la langue de l'utilisateur
"""


# ==================== HELPERS ====================

def _proto_to_dict(obj):
    """Recursively convert protobuf RepeatedComposite/MapComposite to native types."""
    if hasattr(obj, 'items'):  # MapComposite
        return {k: _proto_to_dict(v) for k, v in obj.items()}
    elif hasattr(obj, '__iter__') and not isinstance(obj, (str, bytes)):  # RepeatedComposite
        return [_proto_to_dict(v) for v in obj]
    else:
        return obj


def get_or_create_conversation(db: Session, project_id: str) -> ProjectConversation:
    """Get existing conversation or create a new one."""
    conversation = db.query(ProjectConversation).filter(
        ProjectConversation.project_id == project_id
    ).first()

    if not conversation:
        conversation = ProjectConversation(
            id=str(uuid.uuid4()),
            project_id=project_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    return conversation


def build_nodes_context(nodes: list[Node], edges: list[Edge]) -> str:
    """Build a detailed text representation of nodes with their dependencies."""
    if not nodes:
        return "(Aucun nœud)"

    # Build dependency map
    id_to_slug = {n.id: n.slug for n in nodes}
    deps_map = {}
    for edge in edges:
        if edge.edge_type == "dependency":
            target_slug = id_to_slug.get(edge.target)
            source_slug = id_to_slug.get(edge.source)
            if target_slug and source_slug:
                if target_slug not in deps_map:
                    deps_map[target_slug] = []
                deps_map[target_slug].append(source_slug)

    lines = []
    for node in nodes[:MAX_NODES_IN_CONTEXT]:
        node_type = "PARAM" if node.status == "imposed" else "CALC"
        deps = deps_map.get(node.slug, [])
        deps_str = f" ← [{', '.join(deps)}]" if deps else ""
        val = f"={node.value_computed:.2f}" if node.value_computed is not None else ""
        err = " ⚠️ERREUR" if node.computation_error else ""
        lines.append(f"- {node.label} ({node.slug}) [{node_type}]{deps_str}{val}{err}")

    return "\n".join(lines)


def build_conversation_context(messages: list[ConversationMessage], limit: int = MAX_CONTEXT_MESSAGES) -> list[dict]:
    """Build conversation history for the AI context."""
    recent_messages = messages[-limit:] if len(messages) > limit else messages
    context = []
    for msg in recent_messages:
        context.append({
            "role": "user" if msg.role == "user" else "model",
            "parts": [msg.content]
        })
    return context


# ==================== ENDPOINTS ====================

@router.get("/project-chat/{project_id}", response_model=ConversationOut)
async def get_project_conversation_endpoint(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the conversation history for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    conversation = get_or_create_conversation(db, project_id)
    messages = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == conversation.id
    ).order_by(ConversationMessage.created_at).all()

    return ConversationOut(
        id=conversation.id,
        project_id=conversation.project_id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        context_summary=conversation.context_summary,
        messages=[ChatMessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            metadata=m.extra_data,
            created_at=m.created_at
        ) for m in messages],
        generation_prompt=project.generation_prompt
    )


@router.post("/project-chat/{project_id}", response_model=ChatResponse)
async def send_chat_message(
    project_id: str,
    request: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message and get AI response with potential graph modifications."""
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    edges = db.query(Edge).filter(Edge.project_id == project_id).all()
    nodes_map = {n.slug: n for n in nodes}

    conversation = get_or_create_conversation(db, project_id)
    existing_messages = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == conversation.id
    ).order_by(ConversationMessage.created_at).all()

    # Save user message
    user_message = ConversationMessage(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        role="user",
        content=request.content,
        created_at=datetime.utcnow()
    )
    db.add(user_message)

    try:
        configure_gemini()
        model = genai.GenerativeModel(
            GEMINI_MODEL,
            tools=[GRAPH_TOOLS]
        )

        system_prompt = PROJECT_CHAT_SYSTEM_PROMPT.format(
            project_name=project.name,
            node_count=len(nodes),
            nodes_context=build_nodes_context(nodes, edges)
        )

        conversation_history = build_conversation_context(existing_messages)
        conversation_history.append({"role": "user", "parts": [request.content]})

        # Start chat
        chat = model.start_chat(history=[
            {"role": "user", "parts": [system_prompt]},
            {"role": "model", "parts": ["Compris. Je peux modifier le graphe."]},
            *conversation_history[:-1]  # All but the last message
        ])

        # Send user message and handle function calls
        response = chat.send_message(request.content)

        actions_performed = []
        total_prompt_tokens = 0
        total_completion_tokens = 0

        # Handle function calls in a loop
        max_iterations = 5
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # Track usage
            pt, ct = extract_usage_from_gemini_response(response)
            total_prompt_tokens += pt
            total_completion_tokens += ct

            # Check if there are function calls
            if not response.candidates or not response.candidates[0].content.parts:
                break

            has_function_call = False
            function_responses = []

            for part in response.candidates[0].content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    has_function_call = True
                    fc = part.function_call
                    tool_name = fc.name
                    # Recursively convert protobuf args to native python types
                    tool_args = _proto_to_dict(fc.args) if fc.args else {}

                    logger.info(f"Executing tool: {tool_name}", args=tool_args)

                    # Execute the tool
                    result = execute_tool(tool_name, tool_args, db, project_id, nodes_map)
                    actions_performed.append({
                        "tool": tool_name,
                        "args": tool_args,
                        "result": result
                    })

                    function_responses.append({
                        "function_response": {
                            "name": tool_name,
                            "response": result
                        }
                    })

            if not has_function_call:
                break

            # Send function results back to the model
            # Send function results back to the model
            response = chat.send_message(
                {"parts": function_responses}
            )

        # Get final text response
        ai_response_text = ""
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'text') and part.text:
                    ai_response_text += part.text

        if not ai_response_text and actions_performed:
            # Generate a summary of actions if no text response
            action_summaries = []
            for action in actions_performed:
                result = action.get("result", {})
                if result.get("success"):
                    action_summaries.append(f"✓ {result.get('message', 'Action effectuée')}")
                elif result.get("error"):
                    action_summaries.append(f"✗ {result.get('error')}")
            ai_response_text = "\n".join(action_summaries) if action_summaries else "Actions effectuées."

        # Log AI usage
        log_ai_usage(db, current_user.id, "project_chat", GEMINI_MODEL, total_prompt_tokens, total_completion_tokens)

        # Save AI response
        ai_message = ConversationMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=ai_response_text,
            extra_data={
                "prompt_tokens": total_prompt_tokens,
                "completion_tokens": total_completion_tokens,
                "actions": actions_performed
            },
            created_at=datetime.utcnow()
        )
        db.add(ai_message)
        conversation.updated_at = datetime.utcnow()

        db.commit()

        return ChatResponse(
            message=ChatMessageOut(
                id=ai_message.id,
                role="assistant",
                content=ai_response_text,
                metadata=ai_message.extra_data,
                created_at=ai_message.created_at
            ),
            actions_performed=actions_performed,
            suggested_actions=[]
        )

    except Exception as e:
        db.rollback()
        logger.error("Project chat failed", error=str(e), project_id=project_id)
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.delete("/project-chat/{project_id}")
async def clear_conversation(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear the conversation history for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    conversation = db.query(ProjectConversation).filter(
        ProjectConversation.project_id == project_id
    ).first()

    if conversation:
        db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == conversation.id
        ).delete()
        conversation.context_summary = None
        conversation.summarized_until_index = 0
        conversation.updated_at = datetime.utcnow()
        db.commit()

    return {"status": "ok", "message": "Conversation cleared"}
