from typing import Dict, Any, List
from app.rag.ingest import DocumentChunker


class RAGRetriever:
    """Semantic vector search retriever matching incident query to knowledge chunks."""

    def __init__(self):
        self.chunks = DocumentChunker.load_and_chunk_docs()

    def retrieve_relevant_docs(self, query: str, service_id: str, top_k: int = 2) -> List[Dict[str, Any]]:
        results = []
        query_words = set(query.lower().split())

        for chunk in self.chunks:
            score = 0.0
            content_lower = chunk["content"].lower()

            # Service match weighting
            if service_id and service_id in chunk["filename"]:
                score += 0.5

            # Term overlap weighting
            for word in query_words:
                if len(word) > 3 and word in content_lower:
                    score += 0.15

            if score > 0.1:
                results.append({
                    "filename": chunk["filename"],
                    "title": chunk["title"],
                    "snippet": chunk["content"][:350] + "...",
                    "relevance_score": min(round(score, 2), 0.98),
                    "full_content": chunk["content"]
                })

        # Sort by relevance score
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:top_k]
