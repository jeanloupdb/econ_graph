import sys
import os

# Mock classes to avoid DB dependencies
class MockNode:
    def __init__(self, id, label, slug, pos_x=0, pos_y=0):
        self.id = id
        self.label = label
        self.slug = slug
        self.pos_x = pos_x
        self.pos_y = pos_y

class MockEdge:
    def __init__(self, source, target):
        self.source = source
        self.target = target

# Patch sys.modules to prevent importing real app.models
import types
mock_models = types.ModuleType("app.models")
mock_models.Node = MockNode
mock_models.Edge = MockEdge
sys.modules["app.models"] = mock_models

from app.services.layout import apply_layout

# Alias for test usage
Node = MockNode
Edge = MockEdge

def test_layout():
    print("Creating dummy graph...")
    
    # Create nodes (Dense layer test)
    nodes = [
        Node(id="root1", label="Root 1", slug="root1"),
        Node(id="root2", label="Root 2", slug="root2"),
        
        # Dense middle layer
        Node(id="m1", label="M1", slug="m1"),
        Node(id="m2", label="M2", slug="m2"),
        Node(id="m3", label="M3", slug="m3"),
        Node(id="m4", label="M4", slug="m4"),
        Node(id="m5", label="M5", slug="m5"),
        
        Node(id="leaf", label="Leaf", slug="leaf"),
    ]
    
    # Create edges
    edges = [
        # All middle nodes depend on roots (pulling them together)
        Edge(source="root1", target="m1"),
        Edge(source="root1", target="m2"),
        Edge(source="root1", target="m3"),
        Edge(source="root2", target="m3"),
        Edge(source="root2", target="m4"),
        Edge(source="root2", target="m5"),
        
        # All middle nodes feed into leaf
        Edge(source="m1", target="leaf"),
        Edge(source="m2", target="leaf"),
        Edge(source="m3", target="leaf"),
        Edge(source="m4", target="leaf"),
        Edge(source="m5", target="leaf"),
    ]
    
    print("Applying layout...")
    apply_layout(nodes, edges)
    
    print("\nResults:")
    print(f"{'ID':<10} {'Label':<10} {'X':<10} {'Y':<10}")
    print("-" * 40)
    
    # Sort by Y then X for readability
    nodes.sort(key=lambda n: (n.pos_y, n.pos_x))
    
    for n in nodes:
        print(f"{n.id:<10} {n.label:<10} {n.pos_x:<10.1f} {n.pos_y:<10.1f}")

    # Basic Assertions
    leaf = next(n for n in nodes if n.id == "leaf")
    root1 = next(n for n in nodes if n.id == "root1")
    
    # Leaf should be at the bottom (Highest Y)
    # Roots should be at the top (Lowest Y, likely 0)
    
    if leaf.pos_y > root1.pos_y:
        print("\n✅ SUCCESS: Leaf is below Roots (Bottom-Up confirmed).")
    else:
        print("\n❌ FAILURE: Leaf is NOT below Roots.")

    if leaf.pos_x == 0 or abs(leaf.pos_x) < 1: # Should be centered roughly
         print("✅ SUCCESS: Leaf is centered.")
    else:
         print(f"⚠️ WARNING: Leaf X is {leaf.pos_x}, expected close to 0.")

if __name__ == "__main__":
    test_layout()
