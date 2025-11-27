"""
Seed a demo project 'api' with a few nodes, including one provider-based
root node that fetches its value from a public API (no key required).

Public API used: https://api.exchangerate.host/latest?base=USD&symbols=EUR
JSON path: rates.EUR (numeric), representing the USD/EUR FX rate.

Usage (Docker):
  docker compose run --rm api python -m scripts.seed_api_demo
"""

from datetime import datetime
from sqlalchemy import text

from app.core.db import SessionLocal
from app.models.project import Project
from app.models.node import Node, Status
from app.models.edge import Edge
from app.services.computation import compute_all_nodes


def add_node(db, **kwargs) -> Node:
    n = Node(**kwargs)
    db.add(n)
    db.flush()
    return n


def add_edge(db, src: str, tgt: str, project_id: str) -> Edge:
    e = Edge(
        id=f"{src}->{tgt}",
        project_id=project_id,
        source=src,
        target=tgt,
        label=None,
        edge_type="dependency",
        rule_id=None,
    )
    db.add(e)
    db.flush()
    return e


def main() -> None:
    db = SessionLocal()
    try:
        # Wipe only project 'api' if exists
        db.execute(text("DELETE FROM edge WHERE project_id = 'api'"))
        db.execute(text("DELETE FROM node WHERE project_id = 'api'"))
        db.execute(text("DELETE FROM project WHERE id = 'api'"))

        project_id = "api"
        db.add(Project(id=project_id, name="API Demo", created_at=datetime.utcnow(), updated_at=datetime.utcnow()))
        db.flush()

        # Provider root node: FX USD/EUR
        add_node(
            db,
            id="a_fx",
            project_id=project_id,
            label="FX USD/EUR",
            unit="level",
            status=Status.observed,
            confidence=0.95,
            notes="Taux de change USD/EUR issu d'une API publique (exchangerate.host).",
            # provider config
            provider_enabled=True,
            provider_type="http_json",
            provider_url="https://api.exchangerate.host/latest?base=USD&symbols=EUR",
            provider_json_path="rates.EUR",
            provider_timeout=5.0,
            provider_cache_ttl=0.0,
            # no algorithm needed for a provider root
            computation_definition=None,
            value_computed=None,
        )

        # Simple constants
        add_node(
            db,
            id="a_p_usd",
            project_id=project_id,
            label="Price USD",
            unit="USD",
            status=Status.observed,
            confidence=0.9,
            notes="Prix d'exemple en USD.",
            computation_definition=(
                "def compute():\n"
                "    return 100.0\n"
            ),
            value_computed=None,
        )

        add_node(
            db,
            id="a_vat",
            project_id=project_id,
            label="VAT rate",
            unit="%",
            status=Status.observed,
            confidence=0.9,
            notes="Taux de TVA (%).",
            computation_definition=(
                "def compute():\n"
                "    return 20.0\n"
            ),
            value_computed=None,
        )

        # Derived prices in EUR
        add_node(
            db,
            id="a_p_eur",
            project_id=project_id,
            label="Price EUR",
            unit="EUR",
            status=Status.implied,
            confidence=0.9,
            notes="Conversion du prix USD en EUR via FX.",
            computation_definition=(
                "def compute(a_p_usd, a_fx):\n"
                "    return a_p_usd * a_fx\n"
            ),
            value_computed=None,
        )

        add_node(
            db,
            id="a_p_eur_vat",
            project_id=project_id,
            label="Price EUR (VAT)",
            unit="EUR",
            status=Status.implied,
            confidence=0.9,
            notes="Prix TTC en EUR (TVA appliquée).",
            computation_definition=(
                "def compute(a_p_eur, a_vat):\n"
                "    return a_p_eur * (1 + a_vat/100.0)\n"
            ),
            value_computed=None,
        )

        # Decision node (simple rule)
        add_node(
            db,
            id="a_buy",
            project_id=project_id,
            label="Buy?",
            unit="bool",
            status=Status.implied,
            confidence=0.9,
            notes="Décision simple: 1 si prix TTC < 120 EUR, sinon 0.",
            computation_definition=(
                "def compute(a_p_eur_vat):\n"
                "    return 1 if a_p_eur_vat < 120 else 0\n"
            ),
            value_computed=None,
        )

        for s, t in [("a_p_usd", "a_p_eur"), ("a_fx", "a_p_eur"), ("a_p_eur", "a_p_eur_vat"), ("a_vat", "a_p_eur_vat"), ("a_p_eur_vat", "a_buy")]:
            add_edge(db, s, t, project_id)

        db.commit()

        # Compute all (will fetch provider for fx)
        compute_all_nodes(db, project_id=project_id)
        db.commit()
        print("Seeded project 'api' with nodes: a_fx, a_p_usd, a_vat, a_p_eur, a_p_eur_vat, a_buy")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
