from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.workers import AsyncTaskQueue, run_async_swarm_investigation

router = APIRouter()


class EnqueueTaskResponse(BaseModel):
    task_id: str
    incident_id: str
    status: str
    message: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: int
    created_at: str
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

@router.post("/incidents/{incident_id}/async-investigate", response_model=EnqueueTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def enqueue_async_investigation(
    incident_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Enqueue background AI investigation task returning immediately with task_id."""
    task_id = await AsyncTaskQueue.enqueue_task(run_async_swarm_investigation, incident_id=incident_id, db=db)

    return EnqueueTaskResponse(
        task_id=task_id,
        incident_id=incident_id,
        status="RUNNING",
        message=f"Background investigation job enqueued for incident {incident_id}."
    )


@router.get("/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """Check the status of an asynchronous background job."""
    task_info = AsyncTaskQueue.get_task_status(task_id)
    if not task_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found."
        )
    return TaskStatusResponse(**task_info)
