from typing import Dict, Any, List
from app.remediation.tools import (
    GitHubPullRequestTool,
    ServiceRestartTool,
    ConfigPatchTool,
    GitHubIssueTool,
)


class RemediationExecutor:
    """Orchestrates controlled remediation tools post-human approval."""

    def __init__(self):
        self.pr_tool = GitHubPullRequestTool()
        self.restart_tool = ServiceRestartTool()
        self.patch_tool = ConfigPatchTool()
        self.issue_tool = GitHubIssueTool()

    async def execute_remediation(self, incident: Any) -> Dict[str, Any]:
        service_id = incident.service_id
        incident_id = incident.id
        remediation_desc = incident.recommended_remediation or "Remediation Action"

        executed_actions = []

        # 1. Create GitHub Post-Mortem Issue
        issue_res = await self.issue_tool.execute(
            incident_id=incident_id,
            title=f"[Post-Mortem] {incident.title}",
            summary=remediation_desc
        )
        executed_actions.append(issue_res["action"])

        # 2. Select specific remediation action based on risk & description
        if "max_connections" in remediation_desc.lower() or "database" in remediation_desc.lower():
            patch_res = await self.patch_tool.execute(
                service_id=service_id,
                patch_key="POSTGRES_MAX_CONNECTIONS",
                patch_value=250
            )
            executed_actions.append(patch_res["action"])

        if "rollback" in remediation_desc.lower() or "commit" in remediation_desc.lower():
            pr_res = await self.pr_tool.execute(
                service_id=service_id,
                title=f"fix: Rollback unclosed session changes for {incident_id}",
                diff_patch="- session.generateToken()\n+ session.close()"
            )
            executed_actions.append(pr_res["action"])

        restart_res = await self.restart_tool.execute(service_id=service_id)
        executed_actions.append(restart_res["action"])

        return {
            "success": True,
            "incident_id": incident_id,
            "actions_executed": executed_actions,
            "total_actions": len(executed_actions)
        }
