from langgraph.graph import StateGraph, END
from app.agents.swarm.state import InvestigationState
from app.agents.swarm.supervisor import SupervisorAgentNode
from app.agents.swarm.logs_agent import LogsAgentNode
from app.agents.swarm.metrics_agent import MetricsAgentNode
from app.agents.swarm.github_agent import GitHubAgentNode
from app.agents.swarm.rag_agent import RAGAgentNode
from app.agents.swarm.root_cause_agent import RootCauseAgentNode
from app.agents.swarm.reviewer_agent import ReviewerAgentNode


def build_investigation_graph():
    """Builds and compiles the LangGraph Multi-Agent Investigation StateGraph."""
    workflow = StateGraph(InvestigationState)

    # Instantiate nodes
    supervisor = SupervisorAgentNode()
    logs_agent = LogsAgentNode()
    metrics_agent = MetricsAgentNode()
    github_agent = GitHubAgentNode()
    rag_agent = RAGAgentNode()
    root_cause = RootCauseAgentNode()
    reviewer = ReviewerAgentNode()

    # Add Nodes to Graph
    workflow.add_node("supervisor", supervisor)
    workflow.add_node("logs_agent", logs_agent)
    workflow.add_node("metrics_agent", metrics_agent)
    workflow.add_node("github_agent", github_agent)
    workflow.add_node("rag_agent", rag_agent)
    workflow.add_node("root_cause_agent", root_cause)
    workflow.add_node("reviewer", reviewer)

    # Define Graph Edges
    workflow.set_entry_point("supervisor")

    # Supervisor triggers telemetry collection and RAG retrieval
    workflow.add_edge("supervisor", "logs_agent")
    workflow.add_edge("logs_agent", "metrics_agent")
    workflow.add_edge("metrics_agent", "github_agent")
    workflow.add_edge("github_agent", "rag_agent")
    workflow.add_edge("rag_agent", "root_cause_agent")
    workflow.add_edge("root_cause_agent", "reviewer")

    # Conditional Routing from Reviewer
    def route_reviewer(state: InvestigationState) -> str:
        if state.get("reviewer_approved", False) or state.get("iteration_count", 0) >= 2:
            return END
        return "supervisor"

    workflow.add_conditional_edges(
        "reviewer",
        route_reviewer,
        {
            END: END,
            "supervisor": "supervisor"
        }
    )

    return workflow.compile()
