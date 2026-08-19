from typing import Any, Dict
from app.tools.base import BaseTool
from app.rag.retriever import RAGRetriever


class RAGSearchTool(BaseTool):
    name = "RAGSearchTool"
    description = "Queries internal runbooks, architecture docs, and troubleshooting guides using semantic vector retrieval."

    def __init__(self):
        self.retriever = RAGRetriever()

    async def execute(self, query: str, service_id: str, **kwargs: Any) -> Dict[str, Any]:
        docs = self.retriever.retrieve_relevant_docs(query=query, service_id=service_id)
        return {
            "success": True,
            "query": query,
            "service_id": service_id,
            "retrieved_docs_count": len(docs),
            "documents": docs
        }
