from datetime import datetime
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models import Incident, IncidentStatus
from app.agents.swarm import build_investigation_graph


async def run_async_swarm_investigation(incident_id: str, db: Optional[AsyncSession] = None) -> dict:
    """Async background worker task executing full LangGraph multi-agent swarm graph."""
    async def _execute(session: AsyncSession):
        result = await session.execute(
            select(Incident).options(selectinload(Incident.service)).where(Incident.id == incident_id)
        )
        incident = result.scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident '{incident_id}' not found.")

        incident.status = IncidentStatus.INVESTIGATING
        incident.updated_at = datetime.utcnow()
        await session.commit()

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

        compiled_graph = build_investigation_graph()
        final_state = await compiled_graph.ainvoke(initial_state)

        incident.probable_root_cause = final_state["root_cause_hypothesis"]
        incident.confidence_score = final_state["confidence_score"]
        incident.recommended_remediation = final_state["recommended_remediation"]
        incident.remediation_status = f"AWAITING_APPROVAL ({final_state['remediation_risk_level']} RISK)"
        incident.status = IncidentStatus.ROOT_CAUSE_IDENTIFIED
        incident.updated_at = datetime.utcnow()

        await session.commit()

        return {
            "incident_id": incident_id,
            "root_cause_hypothesis": final_state["root_cause_hypothesis"],
            "confidence_score": final_state["confidence_score"],
            "reviewer_approved": final_state["reviewer_approved"]
        }

    if db is not None:
        return await _execute(db)
    else:
        async with AsyncSessionLocal() as session:
            return await _execute(session)
