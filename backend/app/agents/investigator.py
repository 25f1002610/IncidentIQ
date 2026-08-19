from typing import Dict, Any
from app.tools.log_tool import LogSearchTool
from app.tools.metrics_tool import MetricsTool
from app.tools.github_tool import GitHubTool
from app.tools.incident_history_tool import IncidentHistoryTool
from app.agents.llm_provider import OllamaProvider, SmartFallbackProvider, InvestigationResultSchema


class RootCauseInvestigatorAgent:
    """Specialized Root Cause Investigation Agent orchestrating operational tools and LLM reasoning."""

    def __init__(self, use_ollama: bool = True):
        self.log_tool = LogSearchTool()
        self.metrics_tool = MetricsTool()
        self.github_tool = GitHubTool()
        self.history_tool = IncidentHistoryTool()
        self.llm_provider = OllamaProvider() if use_ollama else SmartFallbackProvider()

    async def investigate_incident(self, incident: Any) -> InvestigationResultSchema:
        incident_id = incident.id
        service_id = incident.service_id

        # 1. Execute Operational Tools in parallel / sequence
        logs_data = await self.log_tool.execute(incident_id=incident_id)
        metrics_data = await self.metrics_tool.execute(incident_id=incident_id)
        github_data = await self.github_tool.execute(incident_id=incident_id)
        history_data = await self.history_tool.execute(service_id=service_id)

        incident_info = {
            "id": incident_id,
            "title": incident.title,
            "description": incident.description,
            "service_id": service_id,
            "severity": incident.severity.value if hasattr(incident.severity, "value") else str(incident.severity)
        }

        # 2. Formulate Root Cause hypothesis via LLM Reasoning
        result = await self.llm_provider.generate_investigation(
            incident_info=incident_info,
            logs_data=logs_data,
            metrics_data=metrics_data,
            github_data=github_data,
            history_data=history_data
        )

        return result
