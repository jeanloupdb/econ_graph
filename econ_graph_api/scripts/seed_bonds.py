"""
Seed a fresh project 'b' (Bonds Decision) with a small graph deciding
whether buying bonds is a good idea for a given country. Short IDs,
clear algorithms, and notes included. Assumes empty DB or will replace
existing data by wiping tables.

Usage (Docker):
  docker compose run --rm api python -m scripts.seed_bonds
"""

from datetime import datetime
from sqlalchemy import text

from app.core.db import SessionLocal
from app.models.project import Project
from app.models.node import Node, Status
from app.models.edge import Edge
from app.services.computation import compute_all_nodes


def add_node(db, *, id: str, label: str, unit: str | None, status: Status, confidence: float, code: str, notes: str | None, project_id: str):
    n = Node(
        id=id,
        project_id=project_id,
        label=label,
        unit=unit,
        status=status,
        confidence=confidence,
        computation_definition=code,
        value_computed=None,
        notes=notes,
    )
    db.add(n)
    db.flush()
    return n


def add_edge(db, *, src: str, tgt: str, project_id: str):
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
        # Wipe tables (FK order)
        db.execute(text("DELETE FROM edge"))
        db.execute(text("DELETE FROM node"))
        db.execute(text("DELETE FROM project"))

        project_id = "b"
        db.add(Project(id=project_id, name="Bonds Decision", created_at=datetime.utcnow(), updated_at=datetime.utcnow()))
        db.flush()

        # Observed constants (country snapshot)
        add_node(
            db,
            id="d2g",
            label="Debt/GDP",
            unit="%",
            status=Status.observed,
            confidence=0.95,
            code=("def compute():\n"
                  "    # Ratio dette/PIB (%)\n"
                  "    return 85.0\n"),
            notes="Ratio dette publique sur PIB (en %).",
            project_id=project_id,
        )
        add_node(
            db,
            id="inf",
            label="Inflation",
            unit="%",
            status=Status.observed,
            confidence=0.95,
            code=("def compute():\n"
                  "    # Inflation annuelle (%)\n"
                  "    return 3.5\n"),
            notes="Inflation annuelle (IPC) en %.",
            project_id=project_id,
        )
        add_node(
            db,
            id="g",
            label="GDP Growth",
            unit="%",
            status=Status.observed,
            confidence=0.9,
            code=("def compute():\n"
                  "    # Croissance réelle du PIB (%)\n"
                  "    return 2.0\n"),
            notes="Croissance réelle du PIB (en %).",
            project_id=project_id,
        )
        add_node(
            db,
            id="defc",
            label="Deficit",
            unit="% GDP",
            status=Status.observed,
            confidence=0.9,
            code=("def compute():\n"
                  "    # Déficit public (% du PIB), négatif si déficit\n"
                  "    return -3.0\n"),
            notes="Solde public (négatif = déficit) en % du PIB.",
            project_id=project_id,
        )
        add_node(
            db,
            id="spr",
            label="Spread",
            unit="bps",
            status=Status.observed,
            confidence=0.9,
            code=("def compute():\n"
                  "    # Spread obligataire (points de base)\n"
                  "    return 150.0\n"),
            notes="Écart de taux vs benchmark (en points de base).",
            project_id=project_id,
        )
        add_node(
            db,
            id="rr",
            label="Real Rate",
            unit="%",
            status=Status.observed,
            confidence=0.9,
            code=("def compute():\n"
                  "    # Taux d'intérêt réel (%)\n"
                  "    return 1.5\n"),
            notes="Taux réel approximatif (taux nominal - inflation attendue).",
            project_id=project_id,
        )

        # Derived risk components
        add_node(
            db,
            id="mr",
            label="Macro Risk",
            unit="score",
            status=Status.implied,
            confidence=0.8,
            code=("def compute(inf, g):\n"
                  "    # Risque macro: inflation au-dessus de 2, et croissance trop faible\n"
                  "    inf_pen = max(0.0, inf - 2.0)\n"
                  "    g_pen = max(0.0, 2.0 - g)\n"
                  "    return inf_pen + g_pen\n"),
            notes="Inflation élevée ou croissance faible augmentent le risque macro.",
            project_id=project_id,
        )
        add_node(
            db,
            id="dr",
            label="Debt Risk",
            unit="score",
            status=Status.implied,
            confidence=0.8,
            code=("def compute(d2g, defc):\n"
                  "    # Risque dette: dette/PIB élevé et déficit important\n"
                  "    d_pen = max(0.0, (d2g - 60.0) / 20.0)\n"
                  "    f_pen = max(0.0, (-defc - 3.0) / 2.0)\n"
                  "    return d_pen + f_pen\n"),
            notes="Dette/PIB et déficit augmentent le risque de soutenabilité.",
            project_id=project_id,
        )
        add_node(
            db,
            id="mkr",
            label="Market Risk",
            unit="score",
            status=Status.implied,
            confidence=0.8,
            code=("def compute(spr, rr):\n"
                  "    # Risque marché: spread élevé, taux réel négatif\n"
                  "    s_pen = max(0.0, (spr - 100.0) / 100.0)\n"
                  "    r_pen = max(0.0, -rr)\n"
                  "    return s_pen + r_pen\n"),
            notes="Spreads élevés ou taux réels négatifs signalent un risque accru.",
            project_id=project_id,
        )
        add_node(
            db,
            id="risk",
            label="Total Risk",
            unit="score",
            status=Status.implied,
            confidence=0.9,
            code=("def compute(mr, dr, mkr):\n"
                  "    # Risque total agrégé\n"
                  "    return mr + dr + mkr\n"),
            notes="Score de risque agrégé (plus élevé = plus risqué).",
            project_id=project_id,
        )

        # Decision
        add_node(
            db,
            id="buy",
            label="Buy Bonds?",
            unit="bool",
            status=Status.implied,
            confidence=0.9,
            code=("def compute(risk):\n"
                  "    # Décision binaire: 1 = acheter, 0 = éviter\n"
                  "    return 1 if risk < 3.0 else 0\n"),
            notes="Décision finale d'achat d'obligations (1 oui, 0 non).",
            project_id=project_id,
        )

        # Edges (dependencies from compute params)
        edges = [
            ("inf", "mr"), ("g", "mr"),
            ("d2g", "dr"), ("defc", "dr"),
            ("spr", "mkr"), ("rr", "mkr"),
            ("mr", "risk"), ("dr", "risk"), ("mkr", "risk"),
            ("risk", "buy"),
        ]
        for s, t in edges:
            add_edge(db, src=s, tgt=t, project_id=project_id)

        db.commit()

        # Compute values
        compute_all_nodes(db, project_id=project_id)
        db.commit()
        print("Seeded project 'b' (Bonds Decision) with nodes: d2g, inf, g, defc, spr, rr, mr, dr, mkr, risk, buy")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

