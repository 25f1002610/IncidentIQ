from datetime import datetime
from app.tools.log_tool import LogSearchTool
from app.agents.swarm.state import InvestigationState


class LogsAgentNode:
    """Logs Agent Node: Executes LogSearchTool to extract error signatures."""

    name = "LogsAgent"

    def __init__(self):
        self.tool = LogSearchTool()

    async def __call__(self, state: InvestigationState) -> InvestigationState:
        incident_id = state["incident_id"]
        logs_res = await self.tool.execute(incident_id=incident_id)

        trace_entry = {
            "agent": self.name,
            "action": "ANALYZE_LOG_STREAMS",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "detail": f"Analyzed log streams: Found {logs_res.get('error_count', 0)} error signatures."
        }

        execution_trace = state.get("execution_trace", [])
        execution_trace.append(trace_entry)

        return {
            **state,
            "logs_evidence": logs_res,
            "execution_trace": execution_trace
        }
