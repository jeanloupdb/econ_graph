import json
import uuid
from datetime import datetime
from typing import Optional

import google.generativeai as genai
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models import Project, Node, Scenario, Edge
from app.models.project_conversation import ConversationMessage
from app.models.scenario import ScenarioNodeOverride
from app.api.insights_trigger import schedule_project_insights

from .shared import GEMINI_MODEL, configure_gemini
from .project_chat_constants import MAX_NODES_IN_CONTEXT, INSIGHTS_MUTATION_TOOLS
from .project_chat_context import (
    build_nodes_context,
    build_scenarios_context,
    build_agent_snapshot,
    build_dashboard_context,
    build_conversation_context,
    enrich_message_with_context,
)
from .project_chat_prompts import PROJECT_CHAT_SYSTEM_PROMPT
from .project_chat_conversation import get_or_create_conversation
from .project_chat_tools import execute_tool
from .project_chat_utils import proto_to_dict as _proto_to_dict
from .project_chat_tools_definitions import GRAPH_TOOLS

logger = get_logger(__name__)


async def stream_chat_generator(
    project_id: str,
    content: str,
    context_data: Optional[dict],
    db: Session,
    user_id: str,
):
    """Generator for streaming chat responses."""

    # Setup (copy-paste of context building logic)
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        yield f"data: {json.dumps({'error': 'Project not found'})}\n\n"
        return

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
        content=content,
        extra_data={"context": context_data} if context_data else None,
        created_at=datetime.utcnow()
    )
    db.add(user_message)
    # We commit early so it's saved even if streaming fails mid-way
    db.commit()

    try:
        configure_gemini()

        system_prompt = PROJECT_CHAT_SYSTEM_PROMPT.format(
            project_name=project.name,
            node_count=len(nodes),
            nodes_context=build_nodes_context(nodes, edges),
            scenarios_context=build_scenarios_context(scenarios, overrides, nodes_by_id),
            dashboard_context=build_dashboard_context(project),
            agent_snapshot=build_agent_snapshot(db, project_id, len(nodes), MAX_NODES_IN_CONTEXT),
        )

        model = genai.GenerativeModel(
            GEMINI_MODEL,
            tools=[GRAPH_TOOLS],
            system_instruction=system_prompt
        )

        conversation_history = build_conversation_context(existing_messages)
        # Note: we don't append the *current* user message to history because prompt is passed to send_message

        # Enrich message with context if user clicked on a specific element
        enriched_content = enrich_message_with_context(content, context_data, nodes_map)

        # Detect action intent BEFORE sending so we can force tool use from the start
        import unicodedata
        def _strip_accents(s: str) -> str:
            return "".join(
                c for c in unicodedata.normalize("NFD", s)
                if unicodedata.category(c) != "Mn"
            )
        _normalized = _strip_accents(enriched_content.strip().lower())
        _action_keywords = [
            "lance cette modification", "modifie", "change", "corrige", "cree",
            "creer", "ajoute", "supprime", "mets a jour", "edite", "nouveau",
            "scenario pessimiste", "scenario optimiste", "scenario pecimiste",
            "scenario",
            # Optimization intents → must trigger scenario creation
            "comment ameliorer", "comment atteindre", "comment optimiser",
            "comment avoir", "comment maximiser", "comment augmenter",
            "comment reduire", "comment diminuer", "comment faire",
            "quel parametre", "que dois-je", "ameliore", "optimise",
            "atteindre", "maximiser", "augmenter", "reduire",
        ]
        action_required = any(kw in _normalized for kw in _action_keywords)

        # Start chat with only conversation history (system prompt is set via system_instruction)
        chat = model.start_chat(history=conversation_history)

        # When an action is expected, force Gemini to call a tool (mode=ANY eliminates randomness)
        _send_kwargs: dict = {"stream": True}
        if action_required:
            _send_kwargs["tool_config"] = {"function_calling_config": {"mode": "ANY"}}

        # Initial request
        current_response_stream = chat.send_message(enriched_content, **_send_kwargs)

        full_ai_response_text = ""
        actions_performed = []
        did_modify_graph = False
        total_prompt_tokens = 0
        total_completion_tokens = 0
        forced_action_attempts = 0
        buffered_text: list[str] = []

        # Loop for handling multi-turn tool use
        max_iterations = 5
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            function_calls_in_turn = []
            text_in_turn = ""

            # Consume the stream
            for chunk in current_response_stream:
                if not chunk.candidates:
                    continue

                for part in chunk.candidates[0].content.parts:
                    try:
                        # Handle text
                        # We check simply if text is present and not empty
                        if hasattr(part, "text") and part.text:
                            text_chunk = part.text
                            text_in_turn += text_chunk
                            if action_required and not actions_performed:
                                buffered_text.append(text_chunk)
                            else:
                                full_ai_response_text += text_chunk
                                yield f"data: {json.dumps({'type': 'content', 'content': text_chunk})}\n\n"
                    except Exception:
                        # Ignore errors accessing text property if it's not a text part
                        pass

                    try:
                        # Handle function call
                        if hasattr(part, "function_call") and part.function_call:
                            fc = part.function_call
                            if fc.name:
                                function_calls_in_turn.append(fc)
                    except Exception:
                        pass

            # End of this stream turn.
            if not function_calls_in_turn:
                if action_required and forced_action_attempts < 1 and not actions_performed:
                    forced_action_attempts += 1
                    buffered_text.clear()
                    # Force tool use on retry (mode=ANY: Gemini must call a function)
                    current_response_stream = chat.send_message(
                        "L'utilisateur attend une ACTION concrète. Appelle maintenant l'outil approprié.",
                        stream=True,
                        tool_config={"function_calling_config": {"mode": "ANY"}},
                    )
                    continue
                break

            # If we have function calls, execute them
            function_responses = []

            for fc in function_calls_in_turn:
                tool_name = fc.name
                tool_args = _proto_to_dict(fc.args) if fc.args else {}

                # Notify frontend of tool execution start
                yield f"data: {json.dumps({'type': 'action_start', 'tool': tool_name, 'args': tool_args})}\n\n"

                # Execute
                result = execute_tool(tool_name, tool_args, db, project_id, nodes_map)
                if tool_name in INSIGHTS_MUTATION_TOOLS and result.get("success"):
                    did_modify_graph = True
                # Commit immediately so mutations persist even if stream closes early
                if result.get("success"):
                    try:
                        db.commit()
                    except Exception as commit_err:
                        logger.error("Commit after tool failed", error=str(commit_err), tool=tool_name)
                        db.rollback()
                        result = {"success": False, "error": f"Erreur de sauvegarde: {str(commit_err)}"}

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

                # Notify frontend of tool result
                yield f"data: {json.dumps({'type': 'action_result', 'tool': tool_name, 'result': result})}\n\n"

            # Send results back to model and continue streaming
            current_response_stream = chat.send_message(
                {"parts": function_responses},
                stream=True
            )

        # Final save of AI message
        extra_data = {
            "prompt_tokens": total_prompt_tokens,
            "completion_tokens": total_completion_tokens,
            "actions": actions_performed
        }
        if context_data:
            extra_data["context"] = context_data

        if action_required and actions_performed and buffered_text:
            buffered_text.clear()

        if action_required and not actions_performed and buffered_text:
            # Gemini responded with text instead of calling tools — show it rather than an error
            full_ai_response_text = "".join(buffered_text)
            yield f"data: {json.dumps({'type': 'content', 'content': full_ai_response_text})}\n\n"
            buffered_text.clear()

        ai_message = ConversationMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=full_ai_response_text,
            extra_data=extra_data,
            created_at=datetime.utcnow()
        )
        db.add(ai_message)
        conversation.updated_at = datetime.utcnow()
        db.commit()
        if did_modify_graph:
            schedule_project_insights(db, project_id, user_id, None)

        # Done
        yield f"data: {json.dumps({'type': 'done', 'message_id': ai_message.id})}\n\n"

    except Exception as e:
        logger.error("Stream error", error=str(e))
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
