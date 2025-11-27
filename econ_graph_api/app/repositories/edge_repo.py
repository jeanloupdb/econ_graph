from sqlalchemy.orm import Session
from app.models.edge import Edge
from app.schemas.edge import EdgeCreate, EdgeUpdate


class EdgeRepository:
    """Repository for edge database operations."""

    @staticmethod
    def get_all(session: Session, project_id: str | None = None) -> list[Edge]:
        """Get all edges (optionally scoped to project)."""
        q = session.query(Edge)
        if project_id:
            q = q.filter(Edge.project_id == project_id)
        return q.all()

    @staticmethod
    def get_by_id(session: Session, edge_id: str) -> Edge | None:
        """Get edge by ID."""
        return session.query(Edge).filter(Edge.id == edge_id).first()

    @staticmethod
    def get_by_node(session: Session, node_id: str, project_id: str | None = None) -> list[Edge]:
        """Get all edges connected to a node (as source or target)."""
        q = session.query(Edge).filter((Edge.source == node_id) | (Edge.target == node_id))
        if project_id:
            q = q.filter(Edge.project_id == project_id)
        return q.all()

    @staticmethod
    def create(session: Session, edge: EdgeCreate, project_id: str | None = None) -> Edge:
        """Create a new edge."""
        db_edge = Edge(
            id=edge.id,
            source=edge.source,
            target=edge.target,
            label=edge.label,
            edge_type=edge.edge_type,
            rule_id=edge.rule_id,
            project_id=edge.project_id or project_id or 'default',
        )
        session.add(db_edge)
        session.flush()
        return db_edge

    @staticmethod
    def update(session: Session, edge_id: str, edge_update: EdgeUpdate) -> Edge | None:
        """Update an edge."""
        db_edge = EdgeRepository.get_by_id(session, edge_id)
        if not db_edge:
            return None

        update_data = edge_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_edge, key, value)

        session.flush()
        return db_edge

    @staticmethod
    def delete(session: Session, edge_id: str) -> bool:
        """Delete an edge."""
        db_edge = EdgeRepository.get_by_id(session, edge_id)
        if not db_edge:
            return False

        session.delete(db_edge)
        session.flush()
        return True
