"""
AI API Router - Point d'entrée principal

Regroupe tous les sous-modules AI :
- code_generation: Génération de code pour les nœuds
- graph_actions: Actions sur le graphe (create/update/delete nodes)
- wizard: Assistant conversationnel pour créer des projets
- usage: Statistiques d'utilisation de l'API
- project_agent: Pipeline multi-agents pour création de projets
- project_chat: Chat IA conversationnel par projet
"""

from fastapi import APIRouter

from .code_generation import router as code_generation_router
from .graph_actions import router as graph_actions_router
from .wizard import router as wizard_router
from .usage import router as usage_router
from .project_chat import router as project_chat_router
from .dashboard_generator import router as dashboard_generator_router
from .import_suggestions import router as import_suggestions_router

try:
    from .project_agent import router as project_agent_router
except ModuleNotFoundError:  # pragma: no cover - optional dependency guard for local/test envs
    project_agent_router = None

# Router principal qui agrège tous les sous-routers
router = APIRouter(prefix="/ai", tags=["ai"])

# Inclure tous les sous-routers
router.include_router(code_generation_router)
router.include_router(graph_actions_router)
router.include_router(wizard_router)
router.include_router(usage_router)
if project_agent_router is not None:
    router.include_router(project_agent_router)
router.include_router(project_chat_router)
router.include_router(dashboard_generator_router)
router.include_router(import_suggestions_router)
