"""
Project Chat endpoint with function calling.

Provides a conversational AI interface for each project.
The AI can actually modify the graph using function calls.
"""

from datetime import datetime
import uuid

import google.generativeai as genai
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.core.deps import get_current_user
from app.core.db import get_db
from app.models import User, Project, Node, Scenario, Edge
from app.models.scenario import ScenarioNodeOverride
from app.models.project_conversation import ProjectConversation, ConversationMessage
from app.schemas.project_chat import (
    ChatMessageCreate, ChatMessageOut, ConversationOut, ChatResponse
)
from app.services.ai_usage import log_ai_usage, extract_usage_from_gemini_response
from app.api.insights_trigger import schedule_project_insights

from .shared import GEMINI_MODEL, configure_gemini
from .project_chat_constants import MAX_NODES_IN_CONTEXT, INSIGHTS_MUTATION_TOOLS
from .project_chat_context import (
    build_nodes_context,
    build_scenarios_context,
    build_agent_snapshot,
    build_conversation_context,
    enrich_message_with_context,
)
from .project_chat_prompts import PROJECT_CHAT_SYSTEM_PROMPT
from .project_chat_tools_definitions import GRAPH_TOOLS
from .project_chat_tools import execute_tool
from .project_chat_utils import proto_to_dict
from .project_chat_conversation import get_or_create_conversation
from .project_chat_streaming import stream_chat_generator

router = APIRouter()
logger = get_logger(__name__)


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
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    """Send a message and get AI response with potential graph modifications."""
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    edges = db.query(Edge).filter(Edge.project_id == project_id).all()
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()
    scenario_ids = [s.id for s in scenarios]
    overrides = []
    if scenario_ids:
        overrides = db.query(ScenarioNodeOverride).filter(
            ScenarioNodeOverride.scenario_id.in_(scenario_ids)
        ).all()
    nodes_map = {n.slug: n for n in nodes}
    nodes_by_id = {n.id: n for n in nodes}

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
        extra_data={"context": request.context.dict()} if request.context else None,
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
            nodes_context=build_nodes_context(nodes, edges),
            scenarios_context=build_scenarios_context(scenarios, overrides, nodes_by_id),
            agent_snapshot=build_agent_snapshot(db, project_id, len(nodes), MAX_NODES_IN_CONTEXT),
        )

        conversation_history = build_conversation_context(existing_messages)

        # Enrich message with context if user clicked on a specific element
        context_dict = request.context.dict() if request.context else None
        enriched_content = enrich_message_with_context(request.content, context_dict, nodes_map)

        conversation_history.append({"role": "user", "parts": [enriched_content]})

        # Start chat
        chat = model.start_chat(history=[
            {"role": "user", "parts": [system_prompt]},
            {"role": "model", "parts": ["Compris. Je suis prêt à t'aider avec ton modèle."]},
            *conversation_history[:-1]  # All but the last message
        ])

        # Send user message and handle function calls
        response = chat.send_message(enriched_content)

        actions_performed = []
        did_modify_graph = False
        total_prompt_tokens = 0
        total_completion_tokens = 0
        # Detect action intent from user message (not just "Lance cette modification")
        _lower = enriched_content.strip().lower()
        _action_keywords = [
            "lance cette modification", "modifie", "change", "corrige", "crée",
            "créer", "ajoute", "supprime", "mets à jour", "édite", "nouveau",
            "scénario pessimiste", "scénario optimiste", "analyse de sensibilité",
        ]
        action_required = any(kw in _lower for kw in _action_keywords)
        forced_action_attempts = 0

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
                if hasattr(part, "function_call") and part.function_call:
                    has_function_call = True
                    fc = part.function_call
                    tool_name = fc.name
                    # Recursively convert protobuf args to native python types
                    tool_args = proto_to_dict(fc.args) if fc.args else {}

                    logger.info(f"Executing tool: {tool_name}", args=tool_args)

                    # Execute the tool
                    result = execute_tool(tool_name, tool_args, db, project_id, nodes_map)
                    if tool_name in INSIGHTS_MUTATION_TOOLS and result.get("success"):
                        did_modify_graph = True
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
                if action_required and forced_action_attempts < 1:
                    forced_action_attempts += 1
                    response = chat.send_message(
                        "STOP. Tu as répondu en texte au lieu d'agir. "
                        "L'utilisateur attend une ACTION. Appelle les outils MAINTENANT. "
                        "Ne réponds pas en texte tant que les outils ne sont pas appelés."
                    )
                    continue
                break

            # Send function results back to the model
            response = chat.send_message(
                {"parts": function_responses}
            )

        # Get final text response
        ai_response_text = ""
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "text") and part.text:
                    ai_response_text += part.text

        if actions_performed:
            # Always keep the response short when actions were performed
            action_summaries = []
            for action in actions_performed:
                result = action.get("result", {})
                if result.get("success"):
                    action_summaries.append(result.get("message", "Action effectuée"))
                elif result.get("error"):
                    action_summaries.append(result.get("error"))
            if action_summaries:
                ai_response_text = "\n".join(action_summaries)
            elif not ai_response_text:
                ai_response_text = "Actions effectuées."
        elif action_required:
            ai_response_text = "Action non exécutée automatiquement. Merci de réessayer."

        # Log AI usage
        log_ai_usage(db, current_user.id, "project_chat", GEMINI_MODEL, total_prompt_tokens, total_completion_tokens)

        # Save AI response
        extra_data = {
            "prompt_tokens": total_prompt_tokens,
            "completion_tokens": total_completion_tokens,
            "actions": actions_performed
        }
        if request.context:
            extra_data["context"] = request.context.dict()

        ai_message = ConversationMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=ai_response_text,
            extra_data=extra_data,
            created_at=datetime.utcnow()
        )
        db.add(ai_message)
        conversation.updated_at = datetime.utcnow()

        db.commit()
        if did_modify_graph:
            schedule_project_insights(db, project_id, current_user.id, background_tasks)

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


@router.post("/project-chat/{project_id}/stream")
async def stream_chat_message(
    project_id: str,
    request: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message and get AI response as SSE stream."""
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    user_id = current_user.id
    return StreamingResponse(
        stream_chat_generator(
            project_id,
            request.content,
            request.context.dict() if request.context else None,
            db,
            user_id,
        ),
        media_type="text/event-stream"
    )
