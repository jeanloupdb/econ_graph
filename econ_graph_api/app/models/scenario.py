"""
Scenario models for SQLAlchemy.

A Scenario represents a set of overrides applied to root nodes (API nodes)
to simulate different economic conditions.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, CheckConstraint, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.db import Base


class Scenario(Base):
    """
    A scenario is a named collection of value overrides for root nodes.

    Scenarios allow users to simulate different economic conditions by
    replacing real API values with custom values.
    """
    __tablename__ = "scenario"

    id = Column(String(64), primary_key=True)
    project_id = Column(
        String(64),
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name = Column(String(255), nullable=False)
    color = Column(String(7), nullable=True)  # Hex color code, e.g., "#3B82F6"
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="scenarios")
    overrides = relationship(
        "ScenarioNodeOverride",
        back_populates="scenario",
        cascade="all, delete-orphan"
    )
    composite_overrides = relationship(
        "ScenarioCompositeOverride",
        back_populates="scenario",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Scenario(id={self.id}, name={self.name}, project_id={self.project_id})>"


class ScenarioNodeOverride(Base):
    """
    An override specifies how a specific root node behaves within a scenario.

    mode:
        - "value": use override_value directly
        - "formula": evaluate override_code(real_value) in the sandbox
    """
    __tablename__ = "scenario_node_override"

    id = Column(String(64), primary_key=True)
    scenario_id = Column(
        String(64),
        ForeignKey("scenario.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    node_id = Column(
        String(64),
        ForeignKey("node.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # Mode: "value" (direct numeric override) or "formula" (Python code)
    # Column is named override_mode in DB to avoid conflicts with SQL aggregate MODE().
    mode = Column("override_mode", String(16), nullable=False, default="value")
    # When mode == "value": numeric override; when None: use real value
    override_value = Column(Float, nullable=True)
    # When mode == "formula": user provided code snippet (body of compute)
    override_code = Column(Text, nullable=True)

    # Relationships
    scenario = relationship("Scenario", back_populates="overrides")
    node = relationship("Node")

    # Constraints
    __table_args__ = (
        # Ensure unique override per node per scenario
        CheckConstraint("scenario_id IS NOT NULL AND node_id IS NOT NULL"),
    )

    def __repr__(self):
        return (
        f"<ScenarioNodeOverride(scenario={self.scenario_id}, node={self.node_id}, "
        f"mode={self.mode}, value={self.override_value})>"
    )


class ScenarioCompositeOverride(Base):
    """
    Override applied to an internal root of a composite node instance.
    """

    __tablename__ = "scenario_composite_override"

    id = Column(String(64), primary_key=True)
    scenario_id = Column(
        String(64),
        ForeignKey("scenario.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    composite_node_instance_id = Column(String(64), nullable=False, index=True)
    internal_id = Column(String(128), nullable=False)
    mode = Column("override_mode", String(16), nullable=False, default="value")
    override_value = Column(Float, nullable=True)
    override_code = Column(Text, nullable=True)

    scenario = relationship("Scenario", back_populates="composite_overrides")

    __table_args__ = (
        UniqueConstraint(
            "scenario_id",
            "composite_node_instance_id",
            "internal_id",
            name="uq_scenario_composite_override_target",
        ),
    )

    def __repr__(self):
        return (
            "<ScenarioCompositeOverride("
            f"scenario={self.scenario_id}, composite_node={self.composite_node_instance_id}, "
            f"internal_id={self.internal_id}, mode={self.mode})>"
        )
