"""Tests for Node CRUD operations."""

import pytest


class TestNodesCRUD:
    """Test suite for /nodes endpoints."""

    def test_health_check(self, client):
        """Test health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_list_nodes_empty(self, client):
        """Test listing nodes when database is empty."""
        response = client.get("/nodes")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_node(self, client, sample_nodes_data):
        """Test creating a single node."""
        node_data = sample_nodes_data[0]
        response = client.post("/nodes", json=node_data)
        assert response.status_code == 201

        data = response.json()
        assert data["id"] == node_data["id"]
        assert data["label"] == node_data["label"]
        assert data["value_computed"] == node_data["value_computed"]
        assert data["unit"] == node_data["unit"]
        assert data["status"] == node_data["status"]
        assert data["confidence"] == node_data["confidence"]
        assert data["in_range"] is True

    def test_create_node_duplicate_id(self, client, sample_nodes_data):
        """Test creating a node with duplicate ID fails."""
        node_data = sample_nodes_data[0]
        # Create first time
        response = client.post("/nodes", json=node_data)
        assert response.status_code == 201

        # Try to create again with same ID
        response = client.post("/nodes", json=node_data)
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_create_node_out_of_bounds(self, client):
        """Test creating a node with value outside plausible range."""
        node_data = {
            "id": "test_node",
            "label": "Test Node",
            "value_computed": 15.0,  # Outside range
            "unit": "percent",
            "plausible_range": [0, 10],
            "status": "observed",
            "confidence": 0.9,
        }
        response = client.post("/nodes", json=node_data)
        assert response.status_code == 422
        assert "outside plausible_range" in response.json()["detail"]

    def test_get_node(self, client, sample_nodes_data):
        """Test retrieving a single node by ID."""
        node_data = sample_nodes_data[0]
        # Create node
        client.post("/nodes", json=node_data)

        # Retrieve node
        response = client.get(f"/nodes/{node_data['id']}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == node_data["id"]
        assert data["label"] == node_data["label"]

    def test_get_node_not_found(self, client):
        """Test retrieving a non-existent node."""
        response = client.get("/nodes/nonexistent")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_list_nodes(self, client, sample_nodes_data):
        """Test listing all nodes."""
        # Create multiple nodes
        for node_data in sample_nodes_data:
            client.post("/nodes", json=node_data)

        # List all nodes
        response = client.get("/nodes")
        assert response.status_code == 200

        data = response.json()
        assert len(data) == len(sample_nodes_data)

    def test_update_node(self, client, sample_nodes_data):
        """Test updating a node."""
        node_data = sample_nodes_data[0]
        # Create node
        client.post("/nodes", json=node_data)

        # Update node
        update_data = {"value_computed": 3.5}
        response = client.patch(f"/nodes/{node_data['id']}", json=update_data)
        assert response.status_code == 200

        data = response.json()
        assert data["value_computed"] == 3.5
        assert data["id"] == node_data["id"]

    def test_update_node_not_found(self, client):
        """Test updating a non-existent node."""
        response = client.patch("/nodes/nonexistent", json={"value_computed": 1.0})
        assert response.status_code == 404

    def test_update_node_out_of_bounds(self, client, sample_nodes_data):
        """Test updating a node with value outside plausible range."""
        node_data = sample_nodes_data[0]
        # Create node
        client.post("/nodes", json=node_data)

        # Try to update with out-of-bounds value
        update_data = {"value_computed": 15.0}  # Outside [0, 10]
        response = client.patch(f"/nodes/{node_data['id']}", json=update_data)
        assert response.status_code == 422
        assert "outside plausible_range" in response.json()["detail"]

    def test_delete_node(self, client, sample_nodes_data):
        """Test deleting a node."""
        node_data = sample_nodes_data[0]
        # Create node
        client.post("/nodes", json=node_data)

        # Delete node
        response = client.delete(f"/nodes/{node_data['id']}")
        assert response.status_code == 204

        # Verify deletion
        response = client.get(f"/nodes/{node_data['id']}")
        assert response.status_code == 404

    def test_delete_node_not_found(self, client):
        """Test deleting a non-existent node."""
        response = client.delete("/nodes/nonexistent")
        assert response.status_code == 404

    def test_node_confidence_validation(self, client):
        """Test confidence value must be between 0 and 1."""
        node_data = {
            "id": "test_confidence",
            "label": "Test Confidence",
            "value_computed": 2.5,
            "confidence": 1.5,  # Invalid
            "status": "observed",
        }
        response = client.post("/nodes", json=node_data)
        # Pydantic should catch this at validation
        assert response.status_code == 422

    def test_node_without_value(self, client):
        """Test creating a node without a value."""
        node_data = {
            "id": "no_value_node",
            "label": "Node Without Value",
            "unit": "percent",
            "status": "unknown",
            "confidence": 0.5,
        }
        response = client.post("/nodes", json=node_data)
        assert response.status_code == 201

        data = response.json()
        assert data.get("value_computed") is None
        assert data["in_range"] is None
