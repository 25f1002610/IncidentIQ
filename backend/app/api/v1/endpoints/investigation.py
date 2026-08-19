from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Incident, Investigation, AuditEvent, IncidentStatus
from app.schemas import IncidentRead
from app.agents import RootCauseInvestigatorAgent, InvestigationResultSchema

router = APIRouter()
agent = RootCauseInvestigatorAgent()


class InvestigationResponse(BaseModel):
    incident: IncidentRead
    root_cause_findings: InvestigationResultSchema
    message: str


@router.post("/incidents/{incident_id}/investigate", response_model=InvestigationResponse)
async def trigger_incident_investigation(
    incident_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Trigger AI Root Cause Investigation for an incident."""
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

    # 2. Run Root Cause Agent Investigation
    findings = await agent.investigate_incident(incident)

    # 3. Update Incident with findings & state
    incident.probable_root_cause = findings.probable_root_cause
    incident.confidence_score = findings.confidence_score
    incident.recommended_remediation = findings.recommended_remediation
    incident.remediation_status = f"AWAITING_APPROVAL ({findings.remediation_risk_level} RISK)"
    incident.status = IncidentStatus.ROOT_CAUSE_IDENTIFIED
    incident.updated_at = datetime.utcnow()

    # 4. Save Audit Event
    audit_event = AuditEvent(
        id=f"AUD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        incident_id=incident_id,
        action="INVESTIGATION_COMPLETED",
        actor="RootCauseInvestigatorAgent",
        details={
            "confidence": findings.confidence_score,
            "evidence_count": len(findings.supporting_evidence),
            "risk_level": findings.remediation_risk_level
        }
    )
    db.add(audit_event)
    await db.commit()
    await db.refresh(incident)

    return InvestigationResponse(
        incident=incident,
        root_cause_findings=findings,
        message=f"AI Investigation complete. Root cause identified with {(findings.confidence_score * 100):.0f}% confidence."
    )
