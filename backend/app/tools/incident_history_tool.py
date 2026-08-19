from typing import Any, Dict, List
from app.tools.base import BaseTool


class IncidentHistoryTool(BaseTool):
    name = "IncidentHistoryTool"
    description = "Searches historical post-mortems and past resolved incidents for recurring root cause patterns."

    async def execute(self, service_id: str, **kwargs: Any) -> Dict[str, Any]:
        # Pre-populated knowledge base of historical post-mortems
        historical_cases = [
            {
                "id": "INC-HIST-084",
                "service_id": "user-db-service",
                "root_cause": "Unindexed high-volume JOIN queries caused connection pool exhaustion.",
                "resolution": "Added composite index on (active, created_at) and increased connection pool size."
            },
            {
                "id": "INC-HIST-102",
                "service_id": "auth-service",
                "root_cause": "Unclosed database session handles in authentication middleware caused memory leak.",
                "resolution": "Wrapped session lifecycle in try/finally context manager."
            },
            {
                "id": "INC-HIST-119",
                "service_id": "payment-service",
                "root_cause": "Third-party payment gateway HTTP client timeout missing, hanging checkout threads.",
                "resolution": "Set strict 3.0s connect/read timeouts on Stripe SDK client."
            }
        ]

        matches = [case for case in historical_cases if case["service_id"] == service_id]
        return {
            "success": True,
            "service_id": service_id,
            "similar_incidents_found": len(matches),
            "historical_matches": matches
        }
