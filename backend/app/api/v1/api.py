from fastapi import APIRouter

from app.api.v1.endpoints import health, incidents

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(incidents.router, tags=["Incidents"])
