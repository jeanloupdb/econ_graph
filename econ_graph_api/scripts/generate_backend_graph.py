import os
import sys
import ast
import requests
import uuid
from pathlib import Path

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Override DATABASE_URL to use localhost (matching fix_project_ownership.py)
# Note: Adjust port if needed based on docker-compose (5433 vs 5432)
# We'll try 5432 first as per existing script, but fallback logic could be added if needed.
os.environ["DATABASE_URL"] = "postgresql+psycopg://econ_user:econ_pass@localhost:5432/econ"

from app.core.db import SessionLocal
from app.models.user import User
from app.models.edge import Edge
from app.core.security import create_access_token

API_URL = "http://localhost:8000"

def get_auth_token():
    """Get access token for the first available user (prefer admin)."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            user = db.query(User).first()
        
        if not user:
            print("No user found in database.")
            sys.exit(1)
            
        print(f"Authenticating as user: {user.username}")
        # Generate token directly without password
        access_token = create_access_token(data={"sub": str(user.id)})
        return access_token
    finally:
        db.close()

def create_project(token, name="Backend Architecture"):
    """Create a new project."""
    headers = {"Authorization": f"Bearer {token}"}
    project_id = str(uuid.uuid4())
    response = requests.post(f"{API_URL}/projects/", json={"id": project_id, "name": name, "description": "Auto-generated backend architecture graph"}, headers=headers)
    if response.status_code in [200, 201]:
        return response.json()
    else:
        print(f"Failed to create project: {response.text}")
        sys.exit(1)

def scan_directory(base_path, sub_dir, type_label):
    """Scan directory for Python files and return nodes."""
    nodes = []
    path = base_path / sub_dir
    if not path.exists():
        return []
        
    for file_path in path.glob("*.py"):
        if file_path.name == "__init__.py":
            continue
            
        module_name = file_path.stem
        full_module_name = f"app.{sub_dir.replace('/', '.')}.{module_name}"
        
        # Read file content to find imports
        with open(file_path, "r") as f:
            content = f.read()
            
        nodes.append({
            "id": full_module_name,
            "name": module_name,
            "type": type_label,
            "path": str(file_path),
            "content": content
        })
    return nodes

def analyze_imports(nodes):
    """Analyze imports to find edges between nodes."""
    edges = []
    node_ids = {n["id"] for n in nodes}
    
    for node in nodes:
        try:
            tree = ast.parse(node["content"])
        except SyntaxError:
            continue
            
        for node_ast in ast.walk(tree):
            if isinstance(node_ast, ast.ImportFrom):
                if not node_ast.module:
                    continue
                
                # Check if import matches any known node
                # e.g. from app.models.user import User -> app.models.user
                module = node_ast.module
                if module in node_ids:
                    edges.append({"source": node["id"], "target": module, "type": "dependency"})
                else:
                    # Try to match partials or sub-modules
                    # e.g. app.models -> app.models.user (might be tricky without precise resolution)
                    # For now, let's stick to exact module matches or direct parent matches
                    pass
                    
            elif isinstance(node_ast, ast.Import):
                for alias in node_ast.names:
                    if alias.name in node_ids:
                        edges.append({"source": node["id"], "target": alias.name, "type": "dependency"})
                        
    return edges

def main():
    print("Starting backend graph generation...")
    
    # 1. Authenticate
    token = get_auth_token()
    
    # 2. Create Project
    project = create_project(token)
    project_id = project["id"]
    print(f"Created project: {project['name']} ({project_id})")
    
    # 3. Scan Codebase
    base_path = Path("app")
    all_nodes = []
    
    print("Scanning directories...")
    all_nodes.extend(scan_directory(base_path, "models", "model"))
    all_nodes.extend(scan_directory(base_path, "schemas", "schema"))
    all_nodes.extend(scan_directory(base_path, "api", "api"))
    all_nodes.extend(scan_directory(base_path, "services", "service"))
    all_nodes.extend(scan_directory(base_path, "core", "core"))
    
    print(f"Found {len(all_nodes)} components.")
    
    # 4. Analyze Dependencies
    edges = analyze_imports(all_nodes)
    print(f"Found {len(edges)} dependencies.")
    
    # 5. Populate Graph
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create Nodes
    print("Creating nodes...")
    for node in all_nodes:
        # Map our types to valid graph node types if needed, or use 'custom'
        # For this visualization, we'll use 'custom' and put the type in data
        payload = {
            "name": node["name"],
            "label": node["name"],
            "slug": node["id"].replace(".", "_"),
            "type": "custom", 
            "data": {
                "module": node["id"],
                "component_type": node["type"],
                "status": "active" # To ensure it has a color
            }
        }
        # We might want to set the ID explicitly to match our module name for easier edge creation
        # But the API usually assigns IDs. We need to map module names to API-assigned IDs.
        # OR, we can try to use the module name as the ID if the API supports it?
        # The API usually generates UUIDs.
        # So we create the node, get the ID, and store the mapping.
        
        # URL: /nodes?project={project_id}
        res = requests.post(f"{API_URL}/nodes?project={project_id}", json=payload, headers=headers)
        if res.status_code in [200, 201]:
            api_node = res.json()
            node["api_id"] = api_node["id"]
        else:
            print(f"Failed to create node {node['name']}: {res.text}")
            
    # Create Edges
    print("Creating edges...")
    # Create a map from module name to API ID
    module_to_id = {n["id"]: n.get("api_id") for n in all_nodes if "api_id" in n}
    
    db = SessionLocal()
    try:
        created_edges = 0
        for edge in edges:
            source_id = module_to_id.get(edge["source"])
            target_id = module_to_id.get(edge["target"])
            
            if source_id and target_id:
                edge_id = f"{source_id}->{target_id}"
                # Check if edge exists (unlikely in new project but good practice)
                existing = db.query(Edge).filter(Edge.id == edge_id).first()
                if not existing:
                    new_edge = Edge(
                        id=edge_id,
                        source=source_id,
                        target=target_id,
                        edge_type="dependency",
                        project_id=project_id
                    )
                    db.add(new_edge)
                    created_edges += 1
        db.commit()
        print(f"Created {created_edges} edges directly in DB.")
    except Exception as e:
        print(f"Failed to create edges: {e}")
        db.rollback()
    finally:
        db.close()
            
    print("Graph generation complete!")
    print(f"View it at: http://localhost:3000/graph?project={project_id}")

if __name__ == "__main__":
    main()
