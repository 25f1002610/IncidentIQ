import uuid
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Incident, Service, IncidentStatus, IncidentSeverity
from app.schemas import IncidentRead
from app.simulator.scenarios import ScenarioType, SCENARIOS
from app.simulator.generator import generate_scenario_telemetry

router = APIRouter()

# In-memory transient telemetry cache for active simulated incidents
SIMULATED_TELEMETRY_CACHE: Dict[str, Dict[str, Any]] = {}


class TriggerScenarioRequest(BaseModel):
    scenario_type: ScenarioType = Field(..., description="Scenario type identifier")


class TriggerScenarioResponse(BaseModel):
    incident: IncidentRead
    scenario: str
    message: str


@router.get("/simulator/scenarios")
async def list_available_scenarios():
    """List all available synthetic production failure scenarios."""
    return [
        {
            "id": s_type,
            "title": data["title"],
            "service_id": data["service_id"],
            "severity": data["severity"],
            "description": data["description"]
        }
        for s_type, data in SCENARIOS.items()
    ]


@router.post("/simulator/trigger", response_model=TriggerScenarioResponse, status_code=status.HTTP_201_CREATED)
async def trigger_failure_scenario(
    request: TriggerScenarioRequest,
    db: AsyncSession = Depends(get_db)
):
    """Trigger a production outage scenario, spawn an Incident, and generate correlated logs/metrics."""
    scenario_info = SCENARIOS.get(request.scenario_type)
    if not scenario_info:
        raise HTTPException(status_code=400, detail=f"Scenario '{request.scenario_type}' not found.")

    # 1. Ensure service exists
    service = await db.get(Service, scenario_info["service_id"])
    if not service:
        service = Service(
            id=scenario_info["service_id"],
            name=scenario_info["service_id"].replace("-", " ").title(),
            description=f"Synthetic catalog entry for {scenario_info['service_id']}"
        )
        db.add(service)
        await db.flush()

    # 2. Create Incident
    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    incident = Incident(
        id=incident_id,
        title=scenario_info["title"],
        description=scenario_info["description"],
        service_id=scenario_info["service_id"],
        severity=IncidentSeverity(scenario_info["severity"]),
        status=IncidentStatus.OPEN,
        detected_at=datetime.utcnow()
    )
    db.add(incident)
    await db.commit()

    # 3. Generate & Cache correlated telemetry
    telemetry = generate_scenario_telemetry(request.scenario_type, incident_id)
    SIMULATED_TELEMETRY_CACHE[incident_id] = telemetry

    # 4. Reload incident with service
    result = await db.execute(
        select(Incident).options(selectinload(Incident.service)).where(Incident.id == incident_id)
    )
    incident_read = result.scalar_one()

    return TriggerScenarioResponse(
        incident=incident_read,
        scenario=request.scenario_type,
        message=f"Scenario '{request.scenario_type}' triggered successfully. Incident {incident_id} created."
    )


@router.get("/simulator/logs/{incident_id}")
async def get_incident_logs(incident_id: str):
    """Fetch synthetic correlated logs for an incident."""
    telemetry = SIMULATED_TELEMETRY_CACHE.get(incident_id)
    if not telemetry:
        # Fallback default logs if not in cache
        return {
            "incident_id": incident_id,
            "logs": [
                {"timestamp": datetime.utcnow().isoformat() + "Z", "service": "system", "level": "INFO", "message": f"Incident {incident_id} created."},
                {"timestamp": datetime.utcnow().isoformat() + "Z", "service": "system", "level": "WARN", "message": "Elevated error rate detected on default telemetry target."}
            ]
        }
    return {
        "incident_id": incident_id,
        "logs": telemetry["logs"]
    }


@router.get("/simulator/metrics/{incident_id}")
async def get_incident_metrics(incident_id: str):
    """Fetch synthetic metrics time-series for an incident."""
    telemetry = SIMULATED_TELEMETRY_CACHE.get(incident_id)
    if not telemetry:
        return {
            "incident_id": incident_id,
            "metrics": []
        }
    return {
        "incident_id": incident_id,
        "metrics": telemetry["metrics"]
    }


@router.get("/simulator/deployments/{incident_id}")
async def get_incident_deployments(incident_id: str):
    """Fetch recent Git commits and deployment diffs for an incident."""
    telemetry = SIMULATED_TELEMETRY_CACHE.get(incident_id)
    if not telemetry:
        return {
            "incident_id": incident_id,
            "commit": None
        }
    return {
        "incident_id": incident_id,
        "commit": telemetry["commit"]
    }
