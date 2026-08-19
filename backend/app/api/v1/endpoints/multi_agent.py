from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Incident, AuditEvent, IncidentStatus
from app.schemas import IncidentRead
from app.agents.swarm import build_investigation_graph

router = APIRouter()
compiled_graph = build_investigation_graph()


class SwarmInvestigationResponse(BaseModel):
    incident: IncidentRead
    root_cause_hypothesis: str
    confidence_score: float
    supporting_evidence: List[str]
    recommended_remediation: str
    remediation_risk_level: str
    reviewer_approved: bool
    reviewer_feedback: str
    execution_trace: List[Dict[str, Any]]


@router.post("/incidents/{incident_id}/investigate-swarm", response_model=SwarmInvestigationResponse)
async def trigger_swarm_investigation(
    incident_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Trigger LangGraph Multi-Agent Swarm Investigation for an incident."""
    result = await db.execute(
        select(Incident).options(selectinload(Incident.service)).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    # 1. Update status to INVESTIGATING
    incident.status = IncidentStatus.INVESTIGATING
    incident.updated_at = datetime.utcnow()
    await db.commit()

    # 2. Prepare initial LangGraph State
    initial_state = {
        "incident_id": incident_id,
        "service_id": incident.service_id,
        "symptoms": incident.description,
        "investigation_plan": [],
        "logs_evidence": {},
        "metrics_evidence": {},
        "github_evidence": {},
        "root_cause_hypothesis": "",
        "confidence_score": 0.0,
        "supporting_evidence": [],
        "recommended_remediation": "",
        "remediation_risk_level": "UNKNOWN",
        "reviewer_approved": False,
        "reviewer_feedback": None,
        "iteration_count": 0,
        "execution_trace": []
    }

    # 3. Execute LangGraph StateGraph workflow
    final_state = await compiled_graph.ainvoke(initial_state)

    # 4. Update Incident with final findings
    incident.probable_root_cause = final_state["root_cause_hypothesis"]
    incident.confidence_score = final_state["confidence_score"]
    incident.recommended_remediation = final_state["recommended_remediation"]
    incident.remediation_status = f"AWAITING_APPROVAL ({final_state['remediation_risk_level']} RISK)"
    incident.status = IncidentStatus.ROOT_CAUSE_IDENTIFIED
    incident.updated_at = datetime.utcnow()

    # 5. Record Audit Event
    audit_event = AuditEvent(
        id=f"AUD-SWARM-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        incident_id=incident_id,
        action="MULTIAGENT_SWARM_COMPLETED",
        actor="LangGraphSwarm",
        details={
            "approved": final_state["reviewer_approved"],
            "iterations": final_state["iteration_count"],
            "trace_length": len(final_state["execution_trace"])
        }
    )
    db.add(audit_event)
    await db.commit()
    await db.refresh(incident)

    return SwarmInvestigationResponse(
        incident=incident,
        root_cause_hypothesis=final_state["root_cause_hypothesis"],
        confidence_score=final_state["confidence_score"],
        supporting_evidence=final_state["supporting_evidence"],
        recommended_remediation=final_state["recommended_remediation"],
        remediation_risk_level=final_state["remediation_risk_level"],
        reviewer_approved=final_state["reviewer_approved"],
        reviewer_feedback=final_state["reviewer_feedback"] or "Approved by Reviewer Agent",
        execution_trace=final_state["execution_trace"]
    )
