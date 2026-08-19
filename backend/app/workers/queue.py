import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, Callable, Awaitable

# In-Memory Async Task Queue Manager for zero-dependency local environments
TASKS_DB: Dict[str, Dict[str, Any]] = {}


class AsyncTaskQueue:
    """Manages asynchronous background jobs for AI Agent Swarm investigations."""

    @staticmethod
    async def enqueue_task(task_func: Callable[..., Awaitable[Any]], *args: Any, **kwargs: Any) -> str:
        task_id = f"TASK-{uuid.uuid4().hex[:8].upper()}"
        
        TASKS_DB[task_id] = {
            "task_id": task_id,
            "status": "RUNNING",
            "progress": 10,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "completed_at": None,
            "result": None,
            "error": None
        }

        # Run task asynchronously in asyncio background loop
        asyncio.create_task(AsyncTaskQueue._run_worker(task_id, task_func, *args, **kwargs))
        return task_id

    @staticmethod
    async def _run_worker(task_id: str, task_func: Callable[..., Awaitable[Any]], *args: Any, **kwargs: Any):
        try:
            result = await task_func(*args, **kwargs)
            TASKS_DB[task_id]["status"] = "SUCCESS"
            TASKS_DB[task_id]["progress"] = 100
            TASKS_DB[task_id]["completed_at"] = datetime.utcnow().isoformat() + "Z"
            TASKS_DB[task_id]["result"] = result
        except Exception as e:
            TASKS_DB[task_id]["status"] = "FAILED"
            TASKS_DB[task_id]["completed_at"] = datetime.utcnow().isoformat() + "Z"
            TASKS_DB[task_id]["error"] = str(e)

    @staticmethod
    def get_task_status(task_id: str) -> Optional[Dict[str, Any]]:
        return TASKS_DB.get(task_id)
