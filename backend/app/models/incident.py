import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Enum as SQLEnum, ForeignKey, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    ROOT_CAUSE_IDENTIFIED = "ROOT_CAUSE_IDENTIFIED"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    REMEDIATING = "REMEDIATING"
    RESOLVED = "RESOLVED"
    FAILED = "FAILED"


class IncidentSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_team: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    repository_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    incidents: Mapped[List["Incident"]] = relationship("Incident", back_populates="service")


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    service_id: Mapped[str] = mapped_column(String(50), ForeignKey("services.id"), nullable=False)
    severity: Mapped[IncidentSeverity] = mapped_column(
        SQLEnum(IncidentSeverity), default=IncidentSeverity.MEDIUM, nullable=False
    )
    status: Mapped[IncidentStatus] = mapped_column(
        SQLEnum(IncidentStatus), default=IncidentStatus.OPEN, nullable=False
    )
    
    # Analysis outputs
    probable_root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recommended_remediation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remediation_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Timestamps
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    service: Mapped["Service"] = relationship("Service", back_populates="incidents")
    investigations: Mapped[List["Investigation"]] = relationship("Investigation", back_populates="incident")


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    incident_id: Mapped[str] = mapped_column(String(50), ForeignKey("incidents.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="RUNNING")
    plan: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    evidence: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    hypotheses: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    incident: Mapped["Incident"] = relationship("Incident", back_populates="investigations")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    incident_id: Mapped[str] = mapped_column(String(50), ForeignKey("incidents.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    actor: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
