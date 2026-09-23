import json
import uuid
from typing import List, Dict, Any
from pydantic import BaseModel
import google.generativeai as genai
from sqlalchemy.orm import Session
from app.models import Project, Node, Edge, Composite
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Configure Gemini
genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)

class RefactoringSuggestion(BaseModel):
    name: str
    description: str
    node_ids: List[str]
    confidence_score: float
    reasoning: str

async def analyze_complexity(db: Session, project_id: str) -> List[RefactoringSuggestion]:
    """
    Analyzes the project graph and suggests clusters of nodes to refactor into Composites.
    """
    # 1. Fetch graph data
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    edges = db.query(Edge).filter(Edge.project_id == project_id).all()

    if len(nodes) < 5:
        return [] # Graph too small to refactor

    # 2. Prepare context for AI
    graph_context = {
        "nodes": [
            {"id": n.id, "slug": n.slug, "label": n.label, "type": n.type, "description": n.description}
            for n in nodes
        ],
        "edges": [
            {"source": e.source_node.slug, "target": e.target_node.slug}
            for e in edges if e.source_node and e.target_node
        ]
    }

    prompt = f"""
    You are an expert Software Architect specializing in Graph Refactoring.
    Your goal is to identify "Clusters" of nodes in a dependency graph that should be grouped into a reusable "Composite" module.

    CONTEXT:
    - The user has a complex economic model graph.
    - We want to simplify it by extracting logical sub-graphs (e.g. "Tax Calculation", "Cost of Goods", "Loan Amortization") into Composites.
    - A good cluster has:
        - High internal cohesion (nodes rely heavily on each other).
        - Low external coupling (few inputs/outputs relative to internal complexity).
        - A clear semantic purpose.

    GRAPH DATA:
    {json.dumps(graph_context, indent=2)}

    INSTRUCTIONS:
    1. Analyze the graph structure and node labels.
    2. Identify 1 to 3 candidate clusters for refactoring.
    3. For each cluster:
        - Give it a clear functional name (e.g. "Salary Module").
        - List the EXACT IDs of the nodes to include.
        - Explain WHY this is a good candidate.
    
    OUTPUT FORMAT (JSON):
    [
        {{
            "name": "Module Name",
            "description": "What this module calculates",
            "node_ids": ["id1", "id2", ...],
            "confidence_score": 0.9,
            "reasoning": "These nodes form a closed loop for calculating taxes..."
        }}
    ]
    """

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.2}
        )
        
        suggestions_data = json.loads(response.text)
        suggestions = [RefactoringSuggestion(**s) for s in suggestions_data]
        return suggestions

    except Exception as e:
        logger.error(f"Refactoring analysis failed: {e}")
        return []

def extract_composite(db: Session, project_id: str, suggestion: RefactoringSuggestion) -> Composite:
    """
    Executes the refactoring: creates a Composite from the suggested nodes and replaces them in the project.
    """
    # 1. Fetch nodes to be moved
    nodes_to_move = db.query(Node).filter(Node.id.in_(suggestion.node_ids), Node.project_id == project_id).all()
    if not nodes_to_move:
        raise ValueError("No nodes found to extract")

    # 2. Create the new Composite entity
    composite_id = str(uuid.uuid4())
    
    # Build the internal graph data for the composite
    # We need to map old IDs to new internal IDs (or keep them if unique enough)
    # For simplicity, we'll keep the structure but clean up project-specific fields
    
    composite_nodes = []
    node_id_map = {} # Old ID -> New Internal ID (if needed, but we can keep same IDs for simplicity inside composite)
    
    for node in nodes_to_move:
        # Create a clean node definition for the composite
        comp_node = {
            "id": node.id, # Keep ID to preserve internal links easily
            "slug": node.slug,
            "label": node.label,
            "type": node.type,
            "unit": node.unit,
            "description": node.description,
            "status": node.status,
            "computation_definition": node.computation_definition,
            "value": node.value, # For parameters
            "pos_x": node.pos_x,
            "pos_y": node.pos_y
        }
        composite_nodes.append(comp_node)
        node_id_map[node.id] = node.id

    # 3. Handle Edges
    # Internal Edges: Both source and target are in the cluster -> Move to Composite
    # Incoming Edges: Source is OUTSIDE, Target is INSIDE -> Becomes a Composite Input
    # Outgoing Edges: Source is INSIDE, Target is OUTSIDE -> Becomes a Composite Output
    
    all_edges = db.query(Edge).filter(Edge.project_id == project_id).all()
    internal_edges = []
    incoming_edges = []
    outgoing_edges = []
    
    cluster_ids = set(suggestion.node_ids)
    
    for edge in all_edges:
        is_source_in = edge.source_id in cluster_ids
        is_target_in = edge.target_id in cluster_ids
        
        if is_source_in and is_target_in:
            internal_edges.append({
                "id": str(uuid.uuid4()),
                "source": edge.source_node.slug, # Use slugs for composite edges usually
                "target": edge.target_node.slug,
                "type": edge.edge_type
            })
            # Mark for deletion from project
            db.delete(edge)
            
        elif not is_source_in and is_target_in:
            incoming_edges.append(edge)
            
        elif is_source_in and not is_target_in:
            outgoing_edges.append(edge)

    # 4. Save Composite
    composite_graph_data = {
        "nodes": composite_nodes,
        "edges": internal_edges
    }
    
    new_composite = Composite(
        id=composite_id,
        name=suggestion.name,
        description=suggestion.description,
        graph_data=composite_graph_data,
        # Identify inputs based on nodes that act as parameters inside the composite
        # OR nodes that had incoming edges from outside.
        # For now, simplistic approach: explicit inputs are not strictly typed in Composite model yet
    )
    db.add(new_composite)
    db.flush()
    
    # 5. Update Project Graph
    
    # Create the new Composite Node in the project
    # Position it at the barycenter of the removed nodes
    avg_x = sum(n.pos_x for n in nodes_to_move) / len(nodes_to_move)
    avg_y = sum(n.pos_y for n in nodes_to_move) / len(nodes_to_move)
    
    composite_node_id = str(uuid.uuid4())
    composite_node_slug = suggestion.name.lower().replace(" ", "_")
    
    new_project_node = Node(
        id=composite_node_id,
        project_id=project_id,
        slug=composite_node_slug,
        label=suggestion.name,
        type="composite",
        composite_id=composite_id,
        pos_x=avg_x,
        pos_y=avg_y,
        description=suggestion.description
    )
    db.add(new_project_node)
    
    # Re-route Incoming Edges
    # The external source now points to the new Composite Node
    # BUT: The composite node needs to know which internal node this input maps to.
    # This is complex. For now, we assume the composite inputs are matched by SLUG.
    # If the external node slug matches an internal node slug, it works.
    # If not, we might need an explicit mapping.
    
    for edge in incoming_edges:
        # Redirect target to the new composite node
        edge.target_id = composite_node_id
        db.add(edge) # Update
        
    # Re-route Outgoing Edges
    # The new Composite Node is now the source
    for edge in outgoing_edges:
        edge.source_id = composite_node_id
        db.add(edge) # Update

    # 6. Delete old nodes
    for node in nodes_to_move:
        db.delete(node)
        
    db.commit()
    return new_composite
