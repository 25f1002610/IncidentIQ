from typing import TypedDict, List, Dict, Any, Optional


class InvestigationState(TypedDict):
    incident_id: str
    service_id: str
    symptoms: str
    investigation_plan: List[str]
    logs_evidence: Dict[str, Any]
    metrics_evidence: Dict[str, Any]
    github_evidence: Dict[str, Any]
    root_cause_hypothesis: str
    confidence_score: float
    supporting_evidence: List[str]
    recommended_remediation: str
    remediation_risk_level: str
    reviewer_approved: bool
    reviewer_feedback: Optional[str]
    iteration_count: int
    execution_trace: List[Dict[str, Any]]
