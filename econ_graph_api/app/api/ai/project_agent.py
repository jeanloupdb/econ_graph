"""
AI Project Agent endpoints.

Multi-agent pipeline for automatic project creation.

Endpoints:
- POST /agent-project-create: Create a complete project via multi-agent pipeline
- GET /agent-status/{task_id}: Stream SSE logs from the pipeline
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
import json
import uuid
import asyncio
import io
import pypdf
from datetime import datetime

from app.core.config import settings
from app.core.logging import get_logger
from app.core.deps import get_current_user
from app.models import User
from app.services.ai_usage import log_ai_usage

from .shared import GEMINI_MODEL

router = APIRouter()
logger = get_logger(__name__)

# Store log queues for each task (in-memory for simplicity)
log_queues: dict[str, asyncio.Queue] = {}


# ==================== REQUEST/RESPONSE MODELS ====================

class AgentProjectCreateRequest(BaseModel):
    prompt: str


class AgentProjectCreateResponse(BaseModel):
    task_id: str
    message: str


# ==================== BACKGROUND TASK ====================

async def run_agent_pipeline_background(task_id: str, prompt: str, user_id: str):
    """Execute the pipeline in background and stream logs"""
    from app.services.agent_pipeline import agent_graph, PipelineState

    queue = log_queues.get(task_id)
    if not queue:
        return

    try:
        # 1. Immediate log: Starting
        await queue.put({
            "type": "log",
            "level": "info",
            "message": "🚀 Démarrage du système...",
            "step": "init",
            "timestamp": datetime.utcnow().isoformat()
        })

        # 2. Log before heavy import (Cold Start)
        await queue.put({
            "type": "log",
            "level": "info",
            "message": "📦 Chargement des modules IA et compilation du graphe...",
            "step": "init",
            "timestamp": datetime.utcnow().isoformat()
        })

        # Force flush logs before blocking import
        await asyncio.sleep(0.1)

        # The import is here and takes time on first launch
        from app.services.agent_pipeline import agent_graph, PipelineState

        # 3. Log after import, before execution
        await queue.put({
            "type": "log",
            "level": "info",
            "message": "🤖 Initialisation des agents terminée. Analyse en cours...",
            "step": "init",
            "timestamp": datetime.utcnow().isoformat()
        })

        # Initial state
        initial_state: PipelineState = {
            "prompt": prompt,
            "user_id": user_id,
            "analyzed_structure": None,
            "project_id": None,
            "created_nodes": {},
            "errors": [],
            "retry_count": 0,
            "logs": [],
            "status": "initializing",
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
        }

        await queue.put({
            "type": "start",
            "message": "Pipeline multi-agents démarré",
            "timestamp": datetime.utcnow().isoformat()
        })

        # Execute LangGraph
        final_state = None
        last_log_index = 0

        async for state_update in agent_graph.astream(initial_state):
            node_name = list(state_update.keys())[0]
            current_state = state_update[node_name]

            # Stream only NEW logs
            all_logs = current_state.get("logs", [])
            new_logs = all_logs[last_log_index:]
            
            for log in new_logs:
                await queue.put(log)
            
            last_log_index = len(all_logs)

        # Extract final state
        if state_update:
            node_name = list(state_update.keys())[-1]
            final_state = state_update[node_name]

        # Log AI usage for the entire pipeline
        if final_state:
            total_prompt_tokens = final_state.get("total_prompt_tokens", 0)
            total_completion_tokens = final_state.get("total_completion_tokens", 0)
            
            if total_prompt_tokens > 0 or total_completion_tokens > 0:
                try:
                    from app.core.db import SessionLocal
                    usage_db = SessionLocal()
                    try:
                        log_ai_usage(
                            usage_db, 
                            user_id, 
                            "create_project", 
                            GEMINI_MODEL, 
                            total_prompt_tokens, 
                            total_completion_tokens
                        )
                    finally:
                        usage_db.close()
                except Exception as usage_error:
                    logger.warning(f"Failed to log AI usage: {usage_error}")

        # Completion message
        if final_state and final_state.get("status") == "success":
            await queue.put({
                "type": "complete",
                "status": "success",
                "project_id": final_state.get("project_id"),
                "message": "✓ Projet créé avec succès !"
            })
        else:
            errors = final_state.get("errors", []) if final_state else []
            error_msg = "✗ Échec de la création du projet"
            if errors:
                error_details = [e.get("error", str(e)) if isinstance(e, dict) else str(e) for e in errors]
                error_msg += f": {'; '.join(error_details)}"
            
            await queue.put({
                "type": "complete",
                "status": "error",
                "message": error_msg,
                "errors": errors
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
        # Keep queue 5 minutes for reconnection
        await asyncio.sleep(300)
        if task_id in log_queues:
            del log_queues[task_id]


# ==================== ENDPOINTS ====================

@router.post("/agent-project-create", response_model=AgentProjectCreateResponse)
async def agent_project_create(
    background_tasks: BackgroundTasks,
    prompt: str = Form(...),
    file: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user)
):
    """
    Create a complete project via multi-agent pipeline.
    Returns a task_id to track progress via SSE.
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
                try:
                    file_text = content.decode('utf-8')
                except UnicodeDecodeError:
                    file_text = "[Contenu binaire ou encodage non supporté]"
            
            full_prompt += f"\n\n[CONTEXTE DU FICHIER JOINT ({file.filename})]:\n{file_text}"
            
        except Exception as e:
            logger.error(f"Failed to process uploaded file: {str(e)}")
            full_prompt += f"\n\n[ERREUR]: Impossible de lire le fichier joint {file.filename}."

    task_id = str(uuid.uuid4())
    log_queues[task_id] = asyncio.Queue()

    # Launch pipeline in background
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
    SSE stream of logs from the multi-agent pipeline.
    """
    queue = log_queues.get(task_id)

    if not queue:
        raise HTTPException(status_code=404, detail="Task not found or expired")

    async def event_generator():
        try:
            while True:
                try:
                    log = await asyncio.wait_for(queue.get(), timeout=30.0)

                    yield {
                        "event": "message",
                        "data": json.dumps(log, ensure_ascii=False)
                    }

                    if log.get("type") == "complete":
                        break

                except asyncio.TimeoutError:
                    # Heartbeat to keep connection alive
                    yield {
                        "event": "heartbeat",
                        "data": json.dumps({"status": "alive"})
                    }

        except asyncio.CancelledError:
            pass

    return EventSourceResponse(event_generator())
