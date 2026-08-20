# 🔌 IncidentIQ Real-World Integration Guide

This guide walks you through connecting your **real external projects** (e.g., Node.js, Python, Go, Java microservices, or GitHub repositories) to IncidentIQ for live incident monitoring, telemetry analysis, and AI root cause investigation.

---

## 🎯 Architectural Overview: How IncidentIQ Connects to Real Projects

IncidentIQ operates as a central AI Operations Control Plane that interfaces with your external software through 4 standard connectors:

```mermaid
graph TD
    subgraph External Real Project
        App[Your Web App / Service] -->|Log Forwarding / Webhook| IncidentIQ_Ingest[IncidentIQ /api/v1/incidents/webhook]
        GitHub[Your GitHub Repository] <-->|GitHub REST API v3| GitHubTool[IncidentIQ GitHubTool]
        Monitoring[Prometheus / CloudWatch / Datadog] <-->|Metrics API| MetricsTool[IncidentIQ MetricsTool]
        Runbooks[Project Docs & Runbooks] -->|Ingest into Vector Store| RAG[IncidentIQ RAG Vector Engine]
    end

    subgraph IncidentIQ AI Platform
        IncidentIQ_Ingest --> Swarm[LangGraph Multi-Agent Swarm]
        GitHubTool --> Swarm
        MetricsTool --> Swarm
        RAG --> Swarm
        Swarm --> RCA[Root Cause Hypothesis & Code Fix PR]
    end
```

---

## 🚀 Step-by-Step: Connecting an External Project

### Step 1: Register Your Project as a Service
Send a `POST /api/v1/services` request to create a service entry for your project:

```bash
curl -X POST http://localhost:8000/api/v1/services \
  -H "Content-Type: application/json" \
  -d '{
    "id": "memora-backend",
    "name": "Memora Backend Service",
    "description": "FastAPI Authentication and Memory Management API",
    "owner_team": "Core Engineering",
    "repository_url": "https://github.com/Vijaykumar5623/Memora"
  }'
```

---

### Step 2: Configure Environment Credentials (`.env`)

To allow IncidentIQ's `GitHubTool` to inspect your repository's commits, pull requests, and file diffs:

1. Generate a Personal Access Token (PAT) on GitHub with `repo` read access.
2. Update your `backend/.env` file:

```env
# GitHub API Credentials
GITHUB_TOKEN=ghp_YourGitHubPersonalAccessTokenHere
GITHUB_ORG_OR_USER=Vijaykumar5623

# Cloud Telemetry (Optional)
PROMETHEUS_URL=http://prometheus.internal:9090
CLOUDWATCH_REGION=us-east-1
```

---

### Step 3: Connect Live Logging & Automated Incident Ingestion

Whenever an unhandled exception or critical error occurs in your application, configure your app's global error handler (e.g. Sentry middleware, Python `logging`, Winston, or FastAPI exception handler) to notify IncidentIQ via Webhook:

#### Python FastAPI / Flask Example:
```python
import requests

def report_incident_to_iq(error: Exception, service_id: str = "memora-backend"):
    payload = {
        "service_id": service_id,
        "title": f"{type(error).__name__}: {str(error)[:100]}",
        "description": f"Production exception caught: {str(error)}",
        "severity": "HIGH"
    }
    try:
        requests.post("http://incidentiq-server:8000/api/v1/incidents/webhook", json=payload, timeout=2)
    except Exception:
        pass  # Non-blocking fallback
```

#### Node.js / Express Example:
```javascript
app.use((err, req, res, next) => {
  fetch('http://incidentiq-server:8000/api/v1/incidents/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: 'auth-service',
      title: err.name || 'Unhandled Server Error',
      description: err.stack || err.message,
      severity: 'CRITICAL'
    })
  }).catch(() => {});
  
  res.status(500).send('Internal Server Error');
});
```

---

### Step 4: Add Project Runbooks to RAG Knowledge Base

Place your project's markdown runbooks, architecture docs, or troubleshooting guides into `backend/app/rag/knowledge/`:

File: `backend/app/rag/knowledge/runbook_memora.md`
```markdown
# Runbook: Memora Backend Troubleshooting

## Common Issues
- **Database Connection Pool Exhaustion:** Occurs when unindexed vector search queries block connections.
- **Remediation:** Increase `POSTGRES_MAX_CONNECTIONS` to 250 and add composite index on `(user_id, created_at)`.
```

IncidentIQ's vector engine automatically ingests this file and attaches matching troubleshooting procedures whenever an incident triggers for `memora-backend`.

---

### Step 5: Trigger AI Swarm Root Cause Investigation

When an incident is created, launch the **LangGraph Multi-Agent Swarm** directly from the UI or via REST API:

```bash
curl -X POST http://localhost:8000/api/v1/incidents/{INCIDENT_ID}/investigate-swarm
```

**What Happens Next:**
1. 📜 **LogsAgent:** Pulls exact stack trace lines from your app's log stream.
2. 🐙 **GitHubAgent:** Queries GitHub API (`https://github.com/Vijaykumar5623/Memora`) to find recent commits deployed in the last 2 hours and pinpoints the exact line of code changed!
3. 📖 **RAGAgent:** References `runbook_memora.md` for recommended fixes.
4. 🔬 **RootCauseAgent:** Synthesizes finding into a grounded root cause hypothesis.
5. 🛡️ **Human Approval:** IncidentIQ proposes a fix (e.g. Draft PR or Config Patch) and waits for your click on **Approve Remediation** in the dashboard!

---

## 🛠️ Summary Checklist for Connecting a Project

- [x] **Step 1:** Register service (`POST /api/v1/services`).
- [x] **Step 2:** Add `GITHUB_TOKEN` to `backend/.env`.
- [x] **Step 3:** Hook application exception handler to `POST /api/v1/incidents/webhook`.
- [x] **Step 4:** Add `.md` runbooks to `backend/app/rag/knowledge/`.
- [x] **Step 5:** Run Multi-Agent Swarm investigation on the IncidentIQ dashboard!
