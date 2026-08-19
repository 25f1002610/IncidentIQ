from datetime import datetime
from app.tools.metrics_tool import MetricsTool
from app.agents.swarm.state import InvestigationState


class MetricsAgentNode:
    """Metrics Agent Node: Executes MetricsTool to pinpoint resource anomalies."""

    name = "MetricsAgent"

    def __init__(self):
        self.tool = MetricsTool()

    async def __call__(self, state: InvestigationState) -> InvestigationState:
        incident_id = state["incident_id"]
        metrics_res = await self.tool.execute(incident_id=incident_id)

        anomalies = metrics_res.get("anomalies_detected", [])
        trace_entry = {
            "agent": self.name,
            "action": "EVALUATE_METRIC_ANOMALIES",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "detail": f"Evaluated time-series metrics: Detected {len(anomalies)} critical resource anomalies."
        }

        execution_trace = state.get("execution_trace", [])
        execution_trace.append(trace_entry)

        return {
            **state,
            "metrics_evidence": metrics_res,
            "execution_trace": execution_trace
        }
