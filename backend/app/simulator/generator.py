from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.simulator.scenarios import SCENARIOS, ScenarioType


def generate_scenario_telemetry(scenario_type: ScenarioType, incident_id: str) -> Dict[str, Any]:
    """Generates correlated telemetry data (logs, metrics, commits) for an incident scenario."""
    scenario = SCENARIOS.get(scenario_type)
    if not scenario:
        raise ValueError(f"Unknown scenario type: {scenario_type}")

    now = datetime.utcnow()

    # Generate timestamped logs
    logs = []
    for idx, raw_log in enumerate(scenario["logs"]):
        log_time = now - timedelta(minutes=(len(scenario["logs"]) - idx) * 2)
        logs.append({
            "id": f"log-{incident_id[:8]}-{idx}",
            "timestamp": log_time.isoformat() + "Z",
            "service": raw_log["source"],
            "level": raw_log["level"],
            "message": raw_log["message"],
            "incident_id": incident_id
        })

    # Generate time-series metrics
    metrics = []
    time_series_raw = scenario["metrics"]
    for idx in range(6):
        metric_time = now - timedelta(minutes=(6 - idx) * 3)
        entry = {
            "timestamp": metric_time.isoformat() + "Z",
            "incident_id": incident_id
        }
        for metric_key, values in time_series_raw.items():
            entry[metric_key] = values[idx]
        metrics.append(entry)

    return {
        "scenario": scenario["id"],
        "title": scenario["title"],
        "service_id": scenario["service_id"],
        "severity": scenario["severity"],
        "description": scenario["description"],
        "expected_root_cause": scenario["expected_root_cause"],
        "logs": logs,
        "metrics": metrics,
        "commit": scenario["commit"]
    }
