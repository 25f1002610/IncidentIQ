from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from pydantic import BaseModel


class BaseTool(ABC):
    """Abstract base class for controlled operational investigation tools."""

    name: str
    description: str

    @abstractmethod
    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Execute tool logic and return structured output."""
        pass
