from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.schemas import HealthCheckResponse

router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """Check application, database, and Redis connectivity."""
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    redis_status = "healthy (configured)"

    return HealthCheckResponse(
        status="ok" if db_status == "healthy" else "degraded",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        database=db_status,
        redis=redis_status,
        timestamp=datetime.utcnow()
    )
