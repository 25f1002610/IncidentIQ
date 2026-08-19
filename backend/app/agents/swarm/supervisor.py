from datetime import datetime
from typing import Dict, Any
from app.agents.swarm.state import InvestigationState


class SupervisorAgentNode:
    """Supervisor Agent: Analyzes incident symptoms and formulates an investigation plan."""

    name = "SupervisorAgent"

    async def __call__(self, state: InvestigationState) -> InvestigationState:
        symptoms = state.get("symptoms", "Unknown operational symptoms")
        service_id = state.get("service_id", "unknown-service")
        iteration = state.get("iteration_count", 0) + 1

        plan = [
            f"1. Delegate log stream analysis to Logs Agent for {service_id}",
            f"2. Delegate resource utilization anomaly detection to Metrics Agent",
            f"3. Delegate deployment code diff inspection to GitHub Agent",
            f"4. Synthesize evidence and evaluate hypothesis with Reviewer Agent"
        ]

        trace_entry = {
            "agent": self.name,
            "action": "CREATE_INVESTIGATION_PLAN",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "detail": f"Iteration #{iteration}: Created {len(plan)}-step investigation plan for '{service_id}'."
        }

        execution_trace = state.get("execution_trace", [])
        execution_trace.append(trace_entry)

        return {
            **state,
            "investigation_plan": plan,
            "iteration_count": iteration,
            "execution_trace": execution_trace
        }
