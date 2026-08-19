from datetime import datetime
from app.agents.swarm.state import InvestigationState


class ReviewerAgentNode:
    """Reviewer Agent Node: Validates evidence grounding and approves or requests retry iteration."""

    name = "ReviewerAgent"

    async def __call__(self, state: InvestigationState) -> InvestigationState:
        hypothesis = state.get("root_cause_hypothesis", "")
        evidence = state.get("supporting_evidence", [])
        confidence = state.get("confidence_score", 0.0)

        # Validation policy: Hypothesis must have evidence and confidence > 0.70
        is_grounded = len(evidence) > 0 and confidence >= 0.70

        if is_grounded:
            approved = True
            feedback = f"Reviewer Approved: Hypothesis is supported by {len(evidence)} evidence points."
        else:
            approved = False
            feedback = "Reviewer Rejected: Hypothesis lacks sufficient grounding. Requesting additional evidence collection."

        trace_entry = {
            "agent": self.name,
            "action": "VALIDATE_HYPOTHESIS",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "detail": f"Reviewer Verdict: {'APPROVED' if approved else 'REJECTED'}. {feedback}"
        }

        execution_trace = state.get("execution_trace", [])
        execution_trace.append(trace_entry)

        return {
            **state,
            "reviewer_approved": approved,
            "reviewer_feedback": feedback,
            "execution_trace": execution_trace
        }
