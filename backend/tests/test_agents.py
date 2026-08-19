import pytest
from httpx import AsyncClient
from app.tools import LogSearchTool, MetricsTool, GitHubTool, IncidentHistoryTool
from app.agents import RootCauseInvestigatorAgent, SmartFallbackProvider


@pytest.mark.asyncio
async def test_operational_tools_execution(client: AsyncClient):
    # 1. Trigger Scenario to populate cache
    trig_resp = await client.post("/api/v1/simulator/trigger", json={
        "scenario_type": "DB_CONN_EXHAUSTION"
    })
    assert trig_resp.status_code == 201
    incident_id = trig_resp.json()["incident"]["id"]

    # 2. Test LogSearchTool
    log_tool = LogSearchTool()
    log_res = await log_tool.execute(incident_id=incident_id)
    assert log_res["success"] is True
    assert log_res["error_count"] > 0

    # 3. Test MetricsTool
    metrics_tool = MetricsTool()
    metrics_res = await metrics_tool.execute(incident_id=incident_id)
    assert metrics_res["success"] is True
    assert metrics_res["has_critical_anomaly"] is True

    # 4. Test GitHubTool
    gh_tool = GitHubTool()
    gh_res = await gh_tool.execute(incident_id=incident_id)
    assert gh_res["success"] is True
    assert gh_res["commit"]["hash"] == "b7e2f1a"

    # 5. Test IncidentHistoryTool
    hist_tool = IncidentHistoryTool()
    hist_res = await hist_tool.execute(service_id="user-db-service")
    assert hist_res["success"] is True
    assert hist_res["similar_incidents_found"] >= 1


@pytest.mark.asyncio
async def test_trigger_investigation_api(client: AsyncClient):
    # 1. Trigger Scenario
    trig_resp = await client.post("/api/v1/simulator/trigger", json={
        "scenario_type": "BAD_DEPLOY_MEMORY_LEAK"
    })
    incident_id = trig_resp.json()["incident"]["id"]

    # 2. Trigger AI Investigation
    inv_resp = await client.post(f"/api/v1/incidents/{incident_id}/investigate")
    assert inv_resp.status_code == 200
    data = inv_resp.json()

    assert data["incident"]["status"] == "ROOT_CAUSE_IDENTIFIED"
    assert "Memory Leak" in data["root_cause_findings"]["probable_root_cause"]
    assert data["root_cause_findings"]["confidence_score"] > 0.8
    assert len(data["root_cause_findings"]["supporting_evidence"]) > 0
    assert data["root_cause_findings"]["remediation_risk_level"] == "HIGH"
