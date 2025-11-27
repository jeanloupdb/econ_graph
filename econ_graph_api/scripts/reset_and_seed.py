"""
Reset database (delete all projects, nodes, edges) and seed a simple demo project
with short IDs and algorithm-friendly compute definitions.

Usage (Docker):
  docker compose run --rm api python -m scripts.reset_and_seed

Usage (local Python):
  export DATABASE_URL=postgresql+psycopg://user:pass@host:port/db
  python -m scripts.reset_and_seed
"""

from datetime import datetime
from sqlalchemy import text

from app.core.db import SessionLocal
from app.models.project import Project
from app.models.node import Node, Status
from app.services.computation import compute_all_nodes
from app.models.edge import Edge


def main() -> None:
    db = SessionLocal()
    try:
        # Wipe all data (respect FK order)
        db.execute(text("DELETE FROM edge"))
        db.execute(text("DELETE FROM node"))
        db.execute(text("DELETE FROM project"))

        # Create a simple project with short IDs
        project_id = "p"
        db.add(
            Project(
                id=project_id,
                name="Demo",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
        )
        db.flush()

        # Seed nodes with short IDs — all algorithmic, even constants
        r = Node(
            id="r",
            project_id=project_id,
            label="Real Rate",
            unit="percent",
            plausible_min=-5.0,
            plausible_max=20.0,
            status=Status.observed,
            confidence=0.95,
            computation_definition=(
                "def compute():\n"
                "    return 2.0\n"
            ),
            value_computed=None,
        )

        pi_e = Node(
            id="pi_e",
            project_id=project_id,
            label="Expected Inflation",
            unit="percent",
            plausible_min=-5.0,
            plausible_max=30.0,
            status=Status.observed,
            confidence=0.9,
            computation_definition=(
                "def compute():\n"
                "    return 3.0\n"
            ),
            value_computed=None,
        )

        i = Node(
            id="i",
            project_id=project_id,
            label="Nominal Rate",
            unit="percent",
            plausible_min=-5.0,
            plausible_max=40.0,
            status=Status.implied,
            confidence=0.9,
            computation_definition=(
                "def compute(r, pi_e):\n"
                "    return r + pi_e\n"
            ),
            value_computed=None,
        )

        g = Node(
            id="g",
            project_id=project_id,
            label="GDP Growth",
            unit="percent",
            plausible_min=-10.0,
            plausible_max=20.0,
            status=Status.observed,
            confidence=0.95,
            computation_definition=(
                "def compute():\n"
                "    return 2.5\n"
            ),
            value_computed=None,
        )

        db.add_all([r, pi_e, i, g])
        db.flush()

        # Create dependency edges from compute signature of i
        edges = [
            Edge(
                id="r->i",
                project_id=project_id,
                source="r",
                target="i",
                label=None,
                edge_type="dependency",
                rule_id=None,
            ),
            Edge(
                id="pi_e->i",
                project_id=project_id,
                source="pi_e",
                target="i",
                label=None,
                edge_type="dependency",
                rule_id=None,
            ),
        ]
        db.add_all(edges)
        db.commit()

        # Compute all to materialize value_computed
        compute_all_nodes(db, project_id=project_id)
        db.commit()
        print("Database reset and demo project 'p' seeded (algorithm-only): r, pi_e, i, g")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
