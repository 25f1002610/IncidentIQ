from typing import Any, Dict, List
from app.tools.base import BaseTool
from app.api.v1.endpoints.simulator import SIMULATED_TELEMETRY_CACHE


class MetricsTool(BaseTool):
    name = "MetricsTool"
    description = "Analyzes CPU, RAM, Latency, and HTTP 500 error rate time-series metrics for anomalous spikes."

    async def execute(self, incident_id: str, **kwargs: Any) -> Dict[str, Any]:
        telemetry = SIMULATED_TELEMETRY_CACHE.get(incident_id)
        if not telemetry or "metrics" not in telemetry:
            return {
                "success": False,
                "incident_id": incident_id,
                "anomalies": [],
                "message": "No metric telemetry data available."
            }

        metrics = telemetry["metrics"]
        anomalies = []

        if metrics:
            latest = metrics[-1]
            for key, val in latest.items():
                if key in ["timestamp", "incident_id"]:
                    continue
                if isinstance(val, (int, float)):
                    if "connection" in key and val > 80:
                        anomalies.append(f"Database connection pool at critical level ({val}% usage)")
                    elif "memory" in key and val > 80:
                        anomalies.append(f"Memory utilization critical at {val}%")
                    elif "500" in key and val > 5:
                        anomalies.append(f"HTTP 500 error rate spiked to {val}%")
                    elif "latency" in key and val > 1000:
                        anomalies.append(f"P99 Latency severely degraded to {val}ms")

        return {
            "success": True,
            "incident_id": incident_id,
            "latest_metrics": metrics[-1] if metrics else {},
            "anomalies_detected": anomalies,
            "has_critical_anomaly": len(anomalies) > 0
        }
