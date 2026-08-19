# IncidentIQ — Product Design Requirements (PDR)

## 1. Product Overview
**Product Name:** IncidentIQ  
**Category:** AI-powered IT Incident Investigation and Response Platform  
**Primary Domain:** DevOps / SRE / Cloud Operations / AI Engineering  

**Core Objective:**
IncidentIQ reduces the time engineers spend investigating production incidents by automatically collecting evidence from logs, metrics, deployments, code repositories, documentation, and historical incidents, then using AI agents to identify probable root causes and recommend remediation.

IncidentIQ is not intended to blindly modify production infrastructure. High-risk actions require human approval.

---

## 2. Core Workflow

```text
Incident Detected
       ↓
IncidentIQ creates investigation
       ↓
Supervisor Agent creates investigation plan
       ↓
Specialized agents collect evidence
       ↓
Evidence is correlated
       ↓
RAG retrieves relevant knowledge
       ↓
Root Cause Agent produces hypothesis
       ↓
Reviewer Agent checks evidence
       ↓
Incident report generated
       ↓
Recommended remediation
       ↓
Human approval
       ↓
Optional remediation execution
       ↓
Incident resolved
       ↓
Post-incident report stored
```

---

## 3. Incident States

```text
OPEN
INVESTIGATING
ROOT_CAUSE_IDENTIFIED
AWAITING_APPROVAL
REMEDIATING
RESOLVED
FAILED
```

---

## 4. Multi-Agent Architecture
* **Supervisor Agent**: Plans & orchestrates tasks.
* **Logs Agent**: Analyzes application & infrastructure logs.
* **Metrics Agent**: Evaluates CPU, RAM, database, network, latency metrics.
* **GitHub Agent**: Examines recent commits, PRs, deployments, diffs.
* **Knowledge/RAG Agent**: Queries runbooks, previous post-mortems, docs.
* **Root Cause Agent**: Synthesizes evidence into grounded hypotheses.
* **Reviewer Agent**: Checks for missing evidence & hallucinations.
* **Remediation Agent**: Formulates and executes approved action plans.
