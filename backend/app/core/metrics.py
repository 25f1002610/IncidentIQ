import time
from fastapi import APIRouter, Response
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# Prometheus Metrics Definitions
HTTP_REQUESTS_TOTAL = Counter(
    "incidentiq_http_requests_total",
    "Total HTTP requests received by IncidentIQ API",
    ["method", "endpoint", "status_code"]
)

INVESTIGATIONS_TOTAL = Counter(
    "incidentiq_investigations_total",
    "Total AI investigations executed",
    ["mode", "severity", "status"]
)

TOOL_EXECUTIONS_TOTAL = Counter(
    "incidentiq_tool_executions_total",
    "Total operational tool executions by AI agents",
    ["tool_name", "status"]
)

INVESTIGATION_LATENCY = Histogram(
    "incidentiq_investigation_latency_seconds",
    "Histogram of AI investigation execution latency in seconds",
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

metrics_router = APIRouter()


@metrics_router.get("/metrics")
async def get_prometheus_metrics():
    """Endpoint for Prometheus metric scrapers."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
