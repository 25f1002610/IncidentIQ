from fastapi import APIRouter

from app.api.v1.endpoints import health, incidents, simulator, investigation, multi_agent, approvals, tasks

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(incidents.router, tags=["Incidents"])
api_router.include_router(simulator.router, tags=["Simulator"])
api_router.include_router(investigation.router, tags=["Investigation"])
api_router.include_router(multi_agent.router, tags=["MultiAgentSwarm"])
api_router.include_router(approvals.router, tags=["HumanApprovals"])
api_router.include_router(tasks.router, tags=["AsyncTasks"])
