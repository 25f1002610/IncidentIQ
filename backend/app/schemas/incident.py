from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict

from app.models.incident import IncidentStatus, IncidentSeverity


class ServiceBase(BaseModel):
    id: str = Field(..., description="Unique service identifier (e.g. auth-service)")
    name: str = Field(..., description="Human-readable service name")
    description: Optional[str] = None
    owner_team: Optional[str] = None
    repository_url: Optional[str] = None


class ServiceCreate(ServiceBase):
    pass


class ServiceRead(ServiceBase):
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class IncidentBase(BaseModel):
    title: str = Field(..., json_schema_extra={"example": "High 500 Error Rate on Auth Service"})
    description: str = Field(..., json_schema_extra={"example": "HTTP 500 error rate spiked above 15% after deploy"})
    service_id: str = Field(..., json_schema_extra={"example": "auth-service"})
    severity: IncidentSeverity = IncidentSeverity.MEDIUM


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None
    probable_root_cause: Optional[str] = None
    confidence_score: Optional[float] = None
    recommended_remediation: Optional[str] = None
    remediation_status: Optional[str] = None


class IncidentRead(IncidentBase):
    id: str
    status: IncidentStatus
    probable_root_cause: Optional[str] = None
    confidence_score: Optional[float] = None
    recommended_remediation: Optional[str] = None
    remediation_status: Optional[str] = None
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    updated_at: datetime
    service: Optional[ServiceRead] = None

    model_config = ConfigDict(from_attributes=True)


class IncidentListResponse(BaseModel):
    total: int
    incidents: List[IncidentRead]


class HealthCheckResponse(BaseModel):
    status: str
    app_name: str
    version: str
    database: str
    redis: str
    timestamp: datetime
