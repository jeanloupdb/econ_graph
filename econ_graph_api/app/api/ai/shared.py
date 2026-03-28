"""
Shared utilities and models for AI endpoints.
"""

from pydantic import BaseModel
import google.generativeai as genai

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Model name constant
GEMINI_MODEL = "gemini-2.0-flash"


def configure_gemini():
    """Configure Gemini API with the API key."""
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        raise ValueError("AI API key not configured")
    genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)


def clean_json_response(text: str) -> str:
    """Clean up markdown code blocks from JSON response and fix invalid escape sequences."""
    import re
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    # Fix invalid JSON escape sequences produced by the LLM (e.g. \s, \i, \p...).
    # Valid JSON escapes after \ are: " \ / b f n r t u
    text = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', text)
    return text


def clean_code_response(text: str) -> str:
    """Clean up markdown code blocks from Python code response."""
    if text.startswith("```python"):
        text = text[9:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def remove_import_statements(code: str) -> str:
    """Remove forbidden import statements from generated code."""
    import re
    code_lines = code.split('\n')
    cleaned_lines = []
    for line in code_lines:
        stripped = line.strip()
        if stripped.startswith('import ') or stripped.startswith('from '):
            logger.warning(f"Removing forbidden import statement: {stripped}")
            continue
        cleaned_lines.append(line)
    return '\n'.join(cleaned_lines)


# ==================== SHARED MODELS ====================

class NodeInputContext(BaseModel):
    id: str
    label: str | None = None
    unit: str | None = None
    description: str | None = None


class GraphNodeContext(BaseModel):
    """Extended context for all nodes in the graph"""
    id: str
    slug: str | None = None
    label: str
    type: str | None = None  # 'computed', 'parameter', 'composite'
    unit: str | None = None
    value: float | None = None
    description: str | None = None
    hasError: bool = False


class GraphContext(BaseModel):
    """Full graph context for AI understanding"""
    totalNodes: int
    availableNodes: list[GraphNodeContext] = []


class AiGenerationContext(BaseModel):
    label: str | None = None
    unit: str | None = None
    description: str | None = None
    inputs: list[NodeInputContext] = []
    # Optional: nodeId if editing an existing node
    nodeId: str | None = None
    # Optional: existing code to modify
    currentCode: str | None = None
    # Optional: full graph context for better understanding
    graphContext: GraphContext | None = None


def build_graph_context_info(graph_context: GraphContext | None) -> str:
    """Build a text representation of the graph context for prompts."""
    if not graph_context:
        return ""
    
    gc = graph_context
    graph_context_info = f"""

FULL GRAPH CONTEXT (for better understanding):
- Total nodes in graph: {gc.totalNodes}
- Available nodes you can reference:
"""
    for node in gc.availableNodes[:20]:
        node_info = f"  * {node.slug or node.id}: {node.label}"
        if node.unit:
            node_info += f" ({node.unit})"
        if node.value is not None:
            node_info += f" = {node.value}"
        if node.description:
            node_info += f" - {node.description}"
        if node.hasError:
            node_info += " [HAS ERROR]"
        graph_context_info += "\n" + node_info

    if gc.totalNodes > 20:
        graph_context_info += f"\n  ... and {gc.totalNodes - 20} more nodes"
    
    return graph_context_info
