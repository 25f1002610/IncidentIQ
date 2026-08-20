import pytest
from httpx import AsyncClient
from evaluation.eval_runner import run_evaluation_benchmark


@pytest.mark.asyncio
async def test_prometheus_metrics_endpoint(client: AsyncClient):
    response = await client.get("/metrics")
    assert response.status_code == 200
    content = response.text
    assert "incidentiq_http_requests_total" in content
    assert "incidentiq_investigations_total" in content


@pytest.mark.asyncio
async def test_jwt_authentication_and_rbac(client: AsyncClient):
    # 1. Login as Admin
    login_resp = await client.post("/api/v1/auth/login", data={
        "username": "admin@incidentiq.com",
        "password": "AdminPass123!"
    })
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert token_data["token_type"] == "bearer"
    assert token_data["role"] == "ADMIN"

    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check /auth/me
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "admin@incidentiq.com"
    assert me_resp.json()["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_evaluation_benchmark_pipeline():
    summary = await run_evaluation_benchmark()
    assert summary["total_cases_evaluated"] == 3
    assert summary["root_cause_accuracy_percent"] >= 80.0
    assert summary["benchmark_status"] == "PASSED"
