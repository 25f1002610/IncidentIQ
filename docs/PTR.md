# IncidentIQ — Product Technical Requirements (PTR)

## 1. High-Level Architecture

```text
                         USER
                          │
                          ▼
                 React Web Application
                          │
                          ▼
                    FastAPI Backend
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
        PostgreSQL      Redis      Agent Runtime
        + pgvector                    │
                                     ▼
                              Supervisor Agent
                                     │
              ┌──────────────────────┼──────────────────┐
              ▼                      ▼                  ▼
          Logs Agent            GitHub Agent        RAG Agent
              │                      │                  │
              └──────────────────────┼──────────────────┘
                                     ▼
                             Root Cause Agent
                                     │
                                     ▼
                               Reviewer Agent
                                     │
                                     ▼
                            Human Approval Layer
                                     │
                                     ▼
                            Remediation Agent
```

---

## 2. Technology Stack
- **Language**: Python 3.11+
- **Backend API**: FastAPI, Pydantic v2, AsyncIO
- **Database**: PostgreSQL 16 + `pgvector` extension
- **Cache / Task Queue**: Redis 7
- **Agent Framework**: LangGraph
- **LLM Abstraction**: Ollama (Local zero-cost first), Grok / OpenAI compatible backends
- **Frontend**: React (Vite + TypeScript + Vanilla CSS Design System)
