import os
from typing import Dict, Any, List


class DocumentChunker:
    """Chunks runbooks and documentation into structured search units with metadata."""

    @staticmethod
    def load_and_chunk_docs() -> List[Dict[str, Any]]:
        knowledge_dir = os.path.join(os.path.dirname(__file__), "knowledge")
        chunks = []

        if not os.path.exists(knowledge_dir):
            return chunks

        for filename in os.listdir(knowledge_dir):
            if filename.endswith(".md"):
                file_path = os.path.join(knowledge_dir, filename)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                # Extract title and sections
                title = filename.replace(".md", "").replace("_", " ").title()
                chunks.append({
                    "id": filename,
                    "title": title,
                    "filename": filename,
                    "content": content,
                    "service_tags": ["user-db-service", "auth-service", "payment-service"]
                })

        return chunks
