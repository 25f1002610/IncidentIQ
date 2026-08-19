import pytest
from httpx import AsyncClient
from app.agents.swarm import build_investigation_graph


@pytest.mark.asyncio
async def test_langgraph_swarm_direct_execution(client: AsyncClient):
    # 1. Trigger Scenario
    trig_resp = await client.post("/api/v1/simulator/trigger", json={
        "scenario_type": "EXTERNAL_API_TIMEOUT"
    })
    incident_id = trig_resp.json()["incident"]["id"]

    # 2. Execute LangGraph directly
    graph = build_investigation_graph()
    initial_state = {
        "incident_id": incident_id,
        "service_id": "payment-service",
        "symptoms": "Stripe Gateway 504 Timeouts",
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

    final_state = await graph.ainvoke(initial_state)

    assert final_state["reviewer_approved"] is True
    assert final_state["confidence_score"] >= 0.70
    assert len(final_state["execution_trace"]) >= 6
    assert any(t["agent"] == "SupervisorAgent" for t in final_state["execution_trace"])
    assert any(t["agent"] == "ReviewerAgent" for t in final_state["execution_trace"])


@pytest.mark.asyncio
async def test_swarm_investigation_api(client: AsyncClient):
    # 1. Trigger Scenario
    trig_resp = await client.post("/api/v1/simulator/trigger", json={
        "scenario_type": "DB_CONN_EXHAUSTION"
    })
    incident_id = trig_resp.json()["incident"]["id"]

    # 2. Call Swarm Endpoint
    swarm_resp = await client.post(f"/api/v1/incidents/{incident_id}/investigate-swarm")
    assert swarm_resp.status_code == 200
    data = swarm_resp.json()

    assert data["incident"]["status"] == "ROOT_CAUSE_IDENTIFIED"
    assert data["reviewer_approved"] is True
    assert len(data["execution_trace"]) >= 6
