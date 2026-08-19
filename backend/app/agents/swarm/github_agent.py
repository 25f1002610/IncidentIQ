from datetime import datetime
from app.tools.github_tool import GitHubTool
from app.agents.swarm.state import InvestigationState


class GitHubAgentNode:
    """GitHub Agent Node: Executes GitHubTool to inspect recent deployment commits and code diffs."""

    name = "GitHubAgent"

    def __init__(self):
        self.tool = GitHubTool()

    async def __call__(self, state: InvestigationState) -> InvestigationState:
        incident_id = state["incident_id"]
        github_res = await self.tool.execute(incident_id=incident_id)

        commit = github_res.get("commit") or {}
        trace_entry = {
            "agent": self.name,
            "action": "INSPECT_GIT_DEPLOYMENTS",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "detail": f"Inspected deployment history: Analyzed commit '{commit.get('hash', 'N/A')}' by {commit.get('author', 'unknown')}."
        }

        execution_trace = state.get("execution_trace", [])
        execution_trace.append(trace_entry)

        return {
            **state,
            "github_evidence": github_res,
            "execution_trace": execution_trace
        }
