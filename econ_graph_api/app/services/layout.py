from typing import List, Dict, Any, Set
from app.models import Node, Edge

def apply_layout(nodes: List[Node], edges: List[Edge]) -> List[Node]:
    """
    Applies a Bottom-Up (Funnel) layout to the nodes.
    
    Algorithm:
    1. Identify Leaves (Rank 0).
    2. Propagate Ranks upwards (Parent Rank = Max(Child Rank) + 1).
    3. Place Leaves centered at the bottom.
    4. Place Parents at the barycenter (average X) of their children.
    5. Resolve collisions to ensure minimum spacing.
    
    Coordinate System:
    - Y-axis: Roots at Top (Y=0), Leaves at Bottom (Y=Max).
    - X-axis: Centered around 0.
    """
    if not nodes:
        return nodes

    node_map = {n.id: n for n in nodes}
    children_map: Dict[str, List[str]] = {n.id: [] for n in nodes}
    
    # Build Graph
    for edge in edges:
        if edge.source in node_map and edge.target in node_map:
            children_map[edge.source].append(edge.target)

    # --- Rank Assignment (Reverse Layers) ---
    # Rank 0 = Leaves (No children)
    # Rank k = max(rank(children)) + 1
    
    ranks: Dict[str, int] = {}
    memo_rank: Dict[str, int] = {}
    visiting: Set[str] = set()

    def get_rank(node_id: str) -> int:
        if node_id in memo_rank:
            return memo_rank[node_id]
        if node_id in visiting:
            return 0 # Cycle detected, treat as leaf/lowest rank to break
        
        visiting.add(node_id)
        
        children = children_map[node_id]
        if not children:
            r = 0
        else:
            # Rank is 1 + max rank of children
            r = 1 + max((get_rank(child_id) for child_id in children), default=-1)
            
        visiting.remove(node_id)
        memo_rank[node_id] = r
        return r

    for n in nodes:
        ranks[n.id] = get_rank(n.id)

    max_rank = max(ranks.values()) if ranks else 0
    
    # Group by rank
    layers: Dict[int, List[str]] = {}
    for n_id, r in ranks.items():
        if r not in layers:
            layers[r] = []
        layers[r].append(n_id)

    # --- X-Coordinate Assignment (Funneling) ---
    
    positions_x: Dict[str, float] = {}
    NODE_SPACING_X = 400  # Increased to prevent overlap of wide labels
    NODE_SPACING_Y = 250
    
    # Helper to find connected components to group Rank 0
    def get_connected_components(nodes: List[Node], edges: List[Edge]) -> List[List[str]]:
        adj = {n.id: set() for n in nodes}
        for e in edges:
            if e.source in adj and e.target in adj:
                adj[e.source].add(e.target)
                adj[e.target].add(e.source)
        
        visited = set()
        components = []
        
        for n in nodes:
            if n.id not in visited:
                component = []
                stack = [n.id]
                visited.add(n.id)
                while stack:
                    curr = stack.pop()
                    component.append(curr)
                    for neighbor in adj[curr]:
                        if neighbor not in visited:
                            visited.add(neighbor)
                            stack.append(neighbor)
                components.append(component)
        return components

    # Process layers from Bottom (Rank 0) to Top (Rank Max)
    for r in range(max_rank + 1):
        if r not in layers:
            continue
            
        nodes_in_layer = layers[r]
        
        if r == 0:
            # Sort by Connected Component, then by Label
            # This prevents interleaving of independent trees
            components = get_connected_components(nodes, edges)
            
            # Map each node to its component index
            node_to_comp = {}
            for idx, comp in enumerate(components):
                for nid in comp:
                    node_to_comp[nid] = idx
            
            # Sort: Component Index -> Label
            nodes_in_layer.sort(key=lambda nid: (node_to_comp.get(nid, -1), node_map[nid].label or ""))
            
            # Initial placement centered
            width = (len(nodes_in_layer) - 1) * NODE_SPACING_X
            start_x = -width / 2
            for i, nid in enumerate(nodes_in_layer):
                positions_x[nid] = start_x + i * NODE_SPACING_X
        else:
            # Calculate barycenter for each node
            def get_barycenter(nid: str) -> float:
                children = children_map[nid]
                if not children:
                    return 0.0
                child_xs = [positions_x.get(cid, 0.0) for cid in children]
                return sum(child_xs) / len(child_xs)

            # Sort by barycenter
            nodes_in_layer.sort(key=get_barycenter)
            
            # Place at barycenter then resolve collisions
            layer_pos = []
            for nid in nodes_in_layer:
                layer_pos.append({
                    "id": nid,
                    "x": get_barycenter(nid)
                })
            
            # Collision Resolution (Left to Right)
            # Ensure at least NODE_SPACING_X between nodes
            for i in range(len(layer_pos) - 1):
                curr = layer_pos[i]
                next_node = layer_pos[i+1]
                if next_node["x"] < curr["x"] + NODE_SPACING_X:
                    next_node["x"] = curr["x"] + NODE_SPACING_X
            
            # Re-center the layer to avoid drift to the right
            if layer_pos:
                avg_x = sum(p["x"] for p in layer_pos) / len(layer_pos)
                # Center this layer relative to 0 (global center)
                shift = -avg_x
                for p in layer_pos:
                    p["x"] += shift
                    positions_x[p["id"]] = p["x"]

    # --- Final Assignment ---
    for n in nodes:
        rank = ranks[n.id]
        # Y-Axis:
        # Rank 0 (Leaf) -> Bottom -> Y = Max
        # Rank Max (Root) -> Top -> Y = 0
        # So Y = (Max_Rank - Rank) * Spacing
        
        n.pos_x = positions_x.get(n.id, 0.0)
        n.pos_y = (max_rank - rank) * NODE_SPACING_Y

    return nodes
