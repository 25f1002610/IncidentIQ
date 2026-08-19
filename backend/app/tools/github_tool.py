from typing import Any, Dict, Optional
from app.tools.base import BaseTool
from app.api.v1.endpoints.simulator import SIMULATED_TELEMETRY_CACHE


class GitHubTool(BaseTool):
    name = "GitHubTool"
    description = "Fetches recent Git commits, pull requests, author context, and code diffs for affected services."

    async def execute(self, incident_id: str, **kwargs: Any) -> Dict[str, Any]:
        telemetry = SIMULATED_TELEMETRY_CACHE.get(incident_id)
        if not telemetry or "commit" not in telemetry:
            return {
                "success": False,
                "incident_id": incident_id,
                "commit": None,
                "message": "No Git deployment context found."
            }

        commit = telemetry["commit"]
        return {
            "success": True,
            "incident_id": incident_id,
            "commit": commit,
            "suspicious_changes": commit.get("diff", "")
        }
