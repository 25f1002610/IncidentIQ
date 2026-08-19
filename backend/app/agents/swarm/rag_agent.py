from datetime import datetime
from app.tools.rag_tool import RAGSearchTool
from app.agents.swarm.state import InvestigationState


class RAGAgentNode:
    """RAG Agent Node: Queries runbooks and documentation for matching troubleshooting procedures."""

    name = "RAGAgent"

    def __init__(self):
        self.tool = RAGSearchTool()

    async def __call__(self, state: InvestigationState) -> InvestigationState:
        symptoms = state.get("symptoms", "")
        service_id = state.get("service_id", "")

        rag_res = await self.tool.execute(query=symptoms, service_id=service_id)
        docs = rag_res.get("documents", [])

        trace_entry = {
            "agent": self.name,
            "action": "QUERY_RUNBOOK_KNOWLEDGE_BASE",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "detail": f"Retrieved {len(docs)} matching runbook references for service '{service_id}'."
        }

        execution_trace = state.get("execution_trace", [])
        execution_trace.append(trace_entry)

        # Attach runbook citations to supporting evidence
        supporting_evidence = state.get("supporting_evidence", [])
        for doc in docs:
            supporting_evidence.append(f"Runbook Citation ({doc['filename']}): {doc['title']} (Relevance: {doc['relevance_score']*100:.0f}%)")

        return {
            **state,
            "supporting_evidence": supporting_evidence,
            "execution_trace": execution_trace
        }
