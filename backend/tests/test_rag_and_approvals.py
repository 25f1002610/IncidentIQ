import pytest
from httpx import AsyncClient
from app.rag import DocumentChunker, RAGRetriever
from app.tools import RAGSearchTool


@pytest.mark.asyncio
async def test_rag_ingestion_and_retrieval():
    # 1. Document Chunker
    chunks = DocumentChunker.load_and_chunk_docs()
    assert len(chunks) >= 3
    filenames = [c["filename"] for c in chunks]
    assert "runbook_user_db.md" in filenames

    # 2. Semantic Retriever
    retriever = RAGRetriever()
    results = retriever.retrieve_relevant_docs(
        query="QueuePool limit reached database connection timeout",
        service_id="user-db-service"
    )
    assert len(results) >= 1
    assert results[0]["filename"] == "runbook_user_db.md"
    assert results[0]["relevance_score"] > 0.50

    # 3. RAGSearchTool
    tool = RAGSearchTool()
    tool_res = await tool.execute(query="memory leak heap dump", service_id="auth-service")
    assert tool_res["success"] is True
    assert tool_res["retrieved_docs_count"] >= 1


@pytest.mark.asyncio
async def test_human_approval_workflow_api(client: AsyncClient):
    # 1. Trigger Scenario and Investigation
    trig_resp = await client.post("/api/v1/simulator/trigger", json={
        "scenario_type": "DB_CONN_EXHAUSTION"
    })
    incident_id = trig_resp.json()["incident"]["id"]

    inv_resp = await client.post(f"/api/v1/incidents/{incident_id}/investigate")
    assert inv_resp.status_code == 200

    # 2. Approve Remediation Action
    appr_resp = await client.post(f"/api/v1/incidents/{incident_id}/approve-remediation", json={
        "approver": "Lead SRE Engineer",
        "comment": "Verified connection pool migration script"
    })
    assert appr_resp.status_code == 200
    data = appr_resp.json()

    assert data["incident"]["status"] == "RESOLVED"
    assert "APPROVED & EXECUTED" in data["incident"]["remediation_status"]
    assert data["approval_status"] == "APPROVED"
