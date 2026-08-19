from datetime import datetime
from app.agents.llm_provider import SmartFallbackProvider
from app.agents.swarm.state import InvestigationState


class RootCauseAgentNode:
    """Root Cause Agent Node: Synthesizes findings from Logs, Metrics, and GitHub agents into a hypothesis."""

    name = "RootCauseAgent"

    def __init__(self):
        self.provider = SmartFallbackProvider()

    async def __call__(self, state: InvestigationState) -> InvestigationState:
        incident_info = {
            "title": state.get("symptoms", "Production Incident"),
            "description": state.get("symptoms", ""),
            "service_id": state.get("service_id", "unknown-service"),
            "severity": "HIGH"
        }

        res = await self.provider.generate_investigation(
            incident_info=incident_info,
            logs_data=state.get("logs_evidence", {}),
            metrics_data=state.get("metrics_evidence", {}),
            github_data=state.get("github_evidence", {}),
            history_data={}
        )

        trace_entry = {
            "agent": self.name,
            "action": "SYNTHESIZE_HYPOTHESIS",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "detail": f"Formulated Root Cause Hypothesis: '{res.probable_root_cause}' with {(res.confidence_score*100):.0f}% confidence."
        }

        execution_trace = state.get("execution_trace", [])
        execution_trace.append(trace_entry)

        return {
            **state,
            "root_cause_hypothesis": res.probable_root_cause,
            "confidence_score": res.confidence_score,
            "supporting_evidence": res.supporting_evidence,
            "recommended_remediation": res.recommended_remediation,
            "remediation_risk_level": res.remediation_risk_level,
            "execution_trace": execution_trace
        }
