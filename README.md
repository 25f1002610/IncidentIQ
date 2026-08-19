# ⚡ IncidentIQ — AI-Powered IT Incident Investigation & Response Platform

IncidentIQ is an autonomous multi-agent platform designed to reduce Mean Time to Resolution (MTTR) during production outages. It correlates application logs, infrastructure metrics, Git commits, pull requests, deployments, runbooks, and historical incident post-mortems to identify probable root causes and propose actionable remediations while enforcing **Human-in-the-Loop** control for high-risk operations.

---

## 🚀 Key Features

- **Multi-Agent Swarm**: Supervisor, Logs, Metrics, GitHub, RAG, Root Cause, Reviewer, and Remediation agents.
- **Evidence-Grounded RCA**: Every hypothesis is backed by specific correlated operational evidence.
- **Human-in-the-Loop Approval**: Low-risk actions auto-executed; medium/high-risk actions require explicit human authorization.
- **RAG Knowledge Base**: Uses PostgreSQL + `pgvector` for semantic search across runbooks, architecture docs, and past post-mortems.
- **Zero-Cost-First Architecture**: Runs 100% locally with Docker, PostgreSQL, Redis, FastAPI, React, and Ollama.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11+, FastAPI, Pydantic v2, AsyncIO, SQLAlchemy 2.0, Alembic
- **Database & Search**: PostgreSQL 16 + `pgvector` extension
- **Caching & Async**: Redis 7
- **Agent Orchestration**: LangGraph
- **Frontend**: React (Vite + TypeScript + Modern Dark Mode CSS)
- **Local AI**: Ollama / OpenAI-compatible provider

---

## ⚙️ Quickstart (Local Development)

### 1. Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+

### 2. Run Infrastructure with Docker Compose
```bash
docker-compose up -d postgres redis
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API Documentation will be live at `http://localhost:8000/docs`.

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the Dashboard at `http://localhost:5173`.

---

## 📖 Architecture & Documentation
- [Product Design Requirements (PDR)](docs/PDR.md)
- [Product Technical Requirements (PTR)](docs/PTR.md)
- [Phase Build Tracker](docs/BUILD_PLAN.md)
