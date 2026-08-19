from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Incident, AuditEvent, IncidentStatus
from app.schemas import IncidentRead

router = APIRouter()


class ApprovalDecisionRequest(BaseModel):
    approver: str = Field(default="SRE On-Call Engineer", description="User or SRE approving/rejecting the remediation action")
    comment: Optional[str] = Field(default=None, description="Optional justification comment")


class ApprovalDecisionResponse(BaseModel):
    incident: IncidentRead
    approval_status: str
    message: str


@router.post("/incidents/{incident_id}/approve-remediation", response_model=ApprovalDecisionResponse)
async def approve_remediation_action(
    incident_id: str,
    request: ApprovalDecisionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Human-in-the-Loop: Authorize and execute recommended remediation action for an incident."""
    result = await db.execute(
        select(Incident).options(selectinload(Incident.service)).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    if not incident.recommended_remediation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incident does not have a recommended remediation proposal to approve."
        )

    # Transition state to REMEDIATING -> RESOLVED
    incident.status = IncidentStatus.RESOLVED
    incident.resolved_at = datetime.utcnow()
    incident.updated_at = datetime.utcnow()

    # Execute approved remediation actions
    from app.remediation import RemediationExecutor
    executor = RemediationExecutor()
    remediation_res = await executor.execute_remediation(incident)

    incident.remediation_status = f"APPROVED BY {request.approver.upper()} ({remediation_res['total_actions']} ACTIONS EXECUTED)"

    # Record Audit Log
    audit_event = AuditEvent(
        id=f"AUD-APP-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        incident_id=incident_id,
        action="HUMAN_REMEDIATION_APPROVED",
        actor=request.approver,
        details={
            "comment": request.comment,
            "remediation": incident.recommended_remediation,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )
    db.add(audit_event)
    await db.commit()
    await db.refresh(incident)

    return ApprovalDecisionResponse(
        incident=incident,
        approval_status="APPROVED",
        message=f"Remediation action approved by {request.approver}. Incident {incident_id} successfully marked RESOLVED."
    )


@router.post("/incidents/{incident_id}/reject-remediation", response_model=ApprovalDecisionResponse)
async def reject_remediation_action(
    incident_id: str,
    request: ApprovalDecisionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Human-in-the-Loop: Reject recommended remediation action for an incident."""
    result = await db.execute(
        select(Incident).options(selectinload(Incident.service)).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    incident.remediation_status = f"REJECTED BY {request.approver.upper()}"
    incident.updated_at = datetime.utcnow()

    # Record Audit Log
    audit_event = AuditEvent(
        id=f"AUD-REJ-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        incident_id=incident_id,
        action="HUMAN_REMEDIATION_REJECTED",
        actor=request.approver,
        details={
            "comment": request.comment,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )
    db.add(audit_event)
    await db.commit()
    await db.refresh(incident)

    return ApprovalDecisionResponse(
        incident=incident,
        approval_status="REJECTED",
        message=f"Remediation action rejected by {request.approver}."
    )
