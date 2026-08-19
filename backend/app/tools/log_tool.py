from typing import Any, Dict, List, Optional
from app.tools.base import BaseTool
from app.api.v1.endpoints.simulator import SIMULATED_TELEMETRY_CACHE


class LogSearchTool(BaseTool):
    name = "LogSearchTool"
    description = "Searches operational log streams for error patterns, stack traces, and warning spikes."

    async def execute(self, incident_id: str, level_filter: Optional[str] = None, **kwargs: Any) -> Dict[str, Any]:
        telemetry = SIMULATED_TELEMETRY_CACHE.get(incident_id)
        if not telemetry:
            return {
                "success": False,
                "incident_id": incident_id,
                "logs_found": [],
                "error_count": 0,
                "message": "No telemetry data found for incident ID."
            }

        logs = telemetry.get("logs", [])
        if level_filter:
            filtered_logs = [log for log in logs if log.get("level") == level_filter.upper()]
        else:
            filtered_logs = [log for log in logs if log.get("level") in ["ERROR", "WARN"]]

        error_logs = [log for log in logs if log.get("level") == "ERROR"]

        return {
            "success": True,
            "incident_id": incident_id,
            "total_logs": len(logs),
            "logs_found": filtered_logs,
            "error_count": len(error_logs),
            "primary_errors": [log["message"] for log in error_logs]
        }
