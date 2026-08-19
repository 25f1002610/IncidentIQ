import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_scenarios(client: AsyncClient):
    response = await client.get("/api/v1/simulator/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) >= 3
    ids = [s["id"] for s in scenarios]
    assert "DB_CONN_EXHAUSTION" in ids
    assert "BAD_DEPLOY_MEMORY_LEAK" in ids


@pytest.mark.asyncio
async def test_trigger_scenario_and_fetch_telemetry(client: AsyncClient):
    # 1. Trigger Scenario
    trigger_resp = await client.post("/api/v1/simulator/trigger", json={
        "scenario_type": "DB_CONN_EXHAUSTION"
    })
    assert trigger_resp.status_code == 201
    data = trigger_resp.json()
    incident_id = data["incident"]["id"]
    assert incident_id.startswith("INC-")
    assert data["incident"]["service_id"] == "user-db-service"

    # 2. Fetch Correlated Logs
    logs_resp = await client.get(f"/api/v1/simulator/logs/{incident_id}")
    assert logs_resp.status_code == 200
    logs_data = logs_resp.json()
    assert len(logs_data["logs"]) > 0
    assert any("sqlalchemy" in log["message"].lower() for log in logs_data["logs"])

    # 3. Fetch Correlated Metrics
    metrics_resp = await client.get(f"/api/v1/simulator/metrics/{incident_id}")
    assert metrics_resp.status_code == 200
    metrics_data = metrics_resp.json()
    assert len(metrics_data["metrics"]) == 6

    # 4. Fetch Recent Deployments / Git Commit
    deploy_resp = await client.get(f"/api/v1/simulator/deployments/{incident_id}")
    assert deploy_resp.status_code == 200
    deploy_data = deploy_resp.json()
    assert deploy_data["commit"]["hash"] == "b7e2f1a"
