import asyncio
import pytest
from httpx import AsyncClient
from app.remediation import RemediationExecutor
from app.workers import AsyncTaskQueue


@pytest.mark.asyncio
async def test_remediation_executor():
    class DummyIncident:
        id = "INC-TEST-99"
        title = "Database Outage"
        service_id = "user-db-service"
        recommended_remediation = "Scale POSTGRES_MAX_CONNECTIONS to 250 and rollback commit a8f9c12"

    executor = RemediationExecutor()
    res = await executor.execute_remediation(DummyIncident())
    assert res["success"] is True
    assert res["total_actions"] >= 3
    assert any("Post-Mortem" in act for act in res["actions_executed"])
    assert any("POSTGRES_MAX_CONNECTIONS" in act for act in res["actions_executed"])


@pytest.mark.asyncio
async def test_async_task_worker_api(client: AsyncClient):
    # 1. Trigger Scenario
    trig_resp = await client.post("/api/v1/simulator/trigger", json={
        "scenario_type": "DB_CONN_EXHAUSTION"
    })
    incident_id = trig_resp.json()["incident"]["id"]

    # 2. Enqueue Async Investigation Task
    enq_resp = await client.post(f"/api/v1/incidents/{incident_id}/async-investigate")
    assert enq_resp.status_code == 202
    task_id = enq_resp.json()["task_id"]
    assert task_id.startswith("TASK-")

    # 3. Poll task status until complete
    for _ in range(10):
        await asyncio.sleep(0.3)
        poll_resp = await client.get(f"/api/v1/tasks/{task_id}")
        assert poll_resp.status_code == 200
        poll_data = poll_resp.json()
        if poll_data["status"] == "SUCCESS":
            break

    assert poll_data["status"] == "SUCCESS"
    assert poll_data["progress"] == 100
    assert poll_data["result"]["incident_id"] == incident_id
