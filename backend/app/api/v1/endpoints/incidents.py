import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Incident, Service, IncidentStatus, IncidentSeverity
from app.schemas import (
    IncidentCreate,
    IncidentUpdate,
    IncidentRead,
    IncidentListResponse,
    ServiceCreate,
    ServiceRead,
)

router = APIRouter()


@router.post("/services", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_in: ServiceCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new service entry in the catalog."""
    existing = await db.get(Service, service_in.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Service with ID '{service_in.id}' already exists."
        )

    service = Service(**service_in.model_dump())
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service


@router.get("/services", response_model=List[ServiceRead])
async def list_services(db: AsyncSession = Depends(get_db)):
    """List all registered services."""
    result = await db.execute(select(Service).order_by(Service.name))
    return result.scalars().all()


@router.post("/incidents", response_model=IncidentRead, status_code=status.HTTP_201_CREATED)
async def create_incident(
    incident_in: IncidentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new incident manually or via integration trigger."""
    # Ensure service exists or create default service entry
    service = await db.get(Service, incident_in.service_id)
    if not service:
        service = Service(
            id=incident_in.service_id,
            name=incident_in.service_id.replace("-", " ").title(),
            description=f"Auto-generated service catalog entry for {incident_in.service_id}"
        )
        db.add(service)
        await db.flush()

    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    incident = Incident(
        id=incident_id,
        title=incident_in.title,
        description=incident_in.description,
        service_id=incident_in.service_id,
        severity=incident_in.severity,
        status=IncidentStatus.OPEN,
        detected_at=datetime.utcnow()
    )
    db.add(incident)
    await db.commit()
    
    # Reload with service relation
    result = await db.execute(
        select(Incident).options(selectinload(Incident.service)).where(Incident.id == incident_id)
    )
    return result.scalar_one()


@router.get("/incidents", response_model=IncidentListResponse)
async def list_incidents(
    status_filter: Optional[IncidentStatus] = Query(None, alias="status"),
    severity_filter: Optional[IncidentSeverity] = Query(None, alias="severity"),
    service_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List incidents with optional state and severity filtering."""
    query = select(Incident).options(selectinload(Incident.service))
    count_query = select(func.count(Incident.id))

    if status_filter:
        query = query.where(Incident.status == status_filter)
        count_query = count_query.where(Incident.status == status_filter)

    if severity_filter:
        query = query.where(Incident.severity == severity_filter)
        count_query = count_query.where(Incident.severity == severity_filter)

    if service_id:
        query = query.where(Incident.service_id == service_id)
        count_query = count_query.where(Incident.service_id == service_id)

    query = query.order_by(Incident.detected_at.desc()).offset(offset).limit(limit)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    incidents_result = await db.execute(query)
    incidents = incidents_result.scalars().all()

    return IncidentListResponse(total=total, incidents=incidents)


@router.get("/incidents/{incident_id}", response_model=IncidentRead)
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information for a specific incident."""
    result = await db.execute(
        select(Incident).options(selectinload(Incident.service)).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )
    return incident


@router.patch("/incidents/{incident_id}", response_model=IncidentRead)
async def update_incident(
    incident_id: str,
    incident_update: IncidentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update incident status, severity, root cause findings, or remediation details."""
    result = await db.execute(
        select(Incident).options(selectinload(Incident.service)).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    update_data = incident_update.model_dump(exclude_unset=True)

    if "status" in update_data and update_data["status"] == IncidentStatus.RESOLVED:
        if not incident.resolved_at:
            incident.resolved_at = datetime.utcnow()

    for field, value in update_data.items():
        setattr(incident, field, value)

    incident.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(incident)
    return incident
