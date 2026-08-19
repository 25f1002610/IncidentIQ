import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["app_name"] == "IncidentIQ"
    assert data["database"] == "healthy"


@pytest.mark.asyncio
async def test_create_and_read_incident(client: AsyncClient):
    # 1. Create Service
    service_resp = await client.post("/api/v1/services", json={
        "id": "payment-api",
        "name": "Payment Processing API",
        "description": "Handles credit card checkouts"
    })
    assert service_resp.status_code == 201

    # 2. Create Incident
    incident_resp = await client.post("/api/v1/incidents", json={
        "title": "Stripe Gateway Timeout Spike",
        "description": "504 Gateway Timeout errors increased by 40% on payment service",
        "service_id": "payment-api",
        "severity": "HIGH"
    })
    assert incident_resp.status_code == 201
    incident_data = incident_resp.json()
    assert incident_data["id"].startswith("INC-")
    assert incident_data["status"] == "OPEN"
    assert incident_data["service"]["name"] == "Payment Processing API"

    incident_id = incident_data["id"]

    # 3. Read Incident by ID
    get_resp = await client.get(f"/api/v1/incidents/{incident_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["title"] == "Stripe Gateway Timeout Spike"

    # 4. List Incidents
    list_resp = await client.get("/api/v1/incidents?severity=HIGH")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total"] == 1
    assert len(list_data["incidents"]) == 1

    # 5. Patch Incident Status
    patch_resp = await client.patch(f"/api/v1/incidents/{incident_id}", json={
        "status": "INVESTIGATING",
        "probable_root_cause": "External payment API connection pool exhaustion"
    })
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "INVESTIGATING"
    assert patch_resp.json()["probable_root_cause"] == "External payment API connection pool exhaustion"
