import enum
from typing import Dict, Any, List


class ScenarioType(str, enum.Enum):
    DB_CONN_EXHAUSTION = "DB_CONN_EXHAUSTION"
    BAD_DEPLOY_MEMORY_LEAK = "BAD_DEPLOY_MEMORY_LEAK"
    EXTERNAL_API_TIMEOUT = "EXTERNAL_API_TIMEOUT"
    NORTHSTAR_FINANCE_EXPOSURE = "NORTHSTAR_FINANCE_EXPOSURE"


SCENARIOS: Dict[ScenarioType, Dict[str, Any]] = {
    ScenarioType.DB_CONN_EXHAUSTION: {
        "id": ScenarioType.DB_CONN_EXHAUSTION,
        "title": "PostgreSQL Connection Pool Exhaustion",
        "service_id": "user-db-service",
        "severity": "CRITICAL",
        "description": "Database connection pool utilization reached 98%. Active queries blocked; 500 error spike detected.",
        "affected_service": "user-db-service",
        "expected_root_cause": "Unindexed high-volume JOIN queries coupled with max_connections limit of 100",
        "logs": [
            {"level": "INFO", "source": "user-db-service", "message": "Received HTTP POST /users/search"},
            {"level": "WARN", "source": "user-db-service", "message": "Connection pool usage above 85% threshold (86/100 connections active)"},
            {"level": "ERROR", "source": "user-db-service", "message": "sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00"},
            {"level": "ERROR", "source": "user-db-service", "message": "HTTP 500 Internal Server Error: Failed to acquire database connection within 30000ms"},
        ],
        "metrics": {
            "db_connections_active": [45, 62, 88, 98, 100, 100],
            "http_500_rate_percentage": [0.1, 0.5, 3.2, 14.5, 28.0, 31.2],
            "p99_latency_ms": [120, 340, 1200, 4800, 15000, 30000],
            "cpu_usage_percent": [25, 30, 42, 68, 88, 92],
            "memory_usage_percent": [40, 42, 45, 48, 50, 52]
        },
        "commit": {
            "hash": "b7e2f1a",
            "author": "dev-engineer@company.com",
            "message": "perf: Add user search endpoint with nested bio matching",
            "timestamp": "12 minutes ago",
            "diff": "- query = select(User).filter_by(active=True)\n+ query = select(User).join(UserProfile).join(UserActivity).order_by(UserActivity.created_at)"
        }
    },
    ScenarioType.BAD_DEPLOY_MEMORY_LEAK: {
        "id": ScenarioType.BAD_DEPLOY_MEMORY_LEAK,
        "title": "Unclosed Session Memory Leak on Auth Service",
        "service_id": "auth-service",
        "severity": "HIGH",
        "description": "RAM consumption steadily escalated from 450MB to 3.8GB following deployment v2.4.1, leading to OOM Kills.",
        "affected_service": "auth-service",
        "expected_root_cause": "Missing `session.close()` in JWT refresh token rotation handler introduced in commit a8f9c12",
        "logs": [
            {"level": "INFO", "source": "auth-service", "message": "Deployed release v2.4.1 (commit a8f9c12)"},
            {"level": "WARN", "source": "auth-service", "message": "Node.js Process memory usage: Heap 1850MB / 2048MB (90.3%)"},
            {"level": "ERROR", "source": "auth-service", "message": "<FATAL> JavaScript heap out of memory. Allocation failed - process terminated"},
            {"level": "WARN", "source": "k8s-cluster", "message": "Container auth-service-7f9d8b-x2k4 restarting due to OOMKilled (Exit Code 137)"},
        ],
        "metrics": {
            "memory_usage_percent": [35, 48, 62, 79, 94, 99],
            "cpu_usage_percent": [15, 22, 38, 75, 88, 12],
            "http_500_rate_percentage": [0.0, 0.1, 0.4, 4.2, 18.9, 45.0],
            "p99_latency_ms": [85, 92, 180, 850, 3400, 12000]
        },
        "commit": {
            "hash": "a8f9c12",
            "author": "security-lead@company.com",
            "message": "feat: Implement refreshToken cache mechanism",
            "timestamp": "25 minutes ago",
            "diff": "+ const session = db.createSession();\n+ const token = session.generateRefreshToken(user);\n// missing session.close() / release"
        }
    },
    ScenarioType.EXTERNAL_API_TIMEOUT: {
        "id": ScenarioType.EXTERNAL_API_TIMEOUT,
        "title": "Stripe Gateway Latency Spike & 504 Timeouts",
        "service_id": "payment-service",
        "severity": "HIGH",
        "description": "Downstream payment gateway response latency surged to 8,000ms. Checkout workers hung waiting for response.",
        "affected_service": "payment-service",
        "expected_root_cause": "Stripe API degraded in us-east-1 region without connection timeout setting on payment client",
        "logs": [
            {"level": "INFO", "source": "payment-service", "message": "Processing checkout intent #chk_98412"},
            {"level": "WARN", "source": "payment-service", "message": "Stripe HTTP client request took 6200ms (threshold: 2000ms)"},
            {"level": "ERROR", "source": "payment-service", "message": "httpx.ReadTimeout: HTTP Read Timeout while requesting https://api.stripe.com/v1/payment_intents"},
            {"level": "ERROR", "source": "payment-service", "message": "HTTP 504 Gateway Timeout: Checkout service failed to respond"},
        ],
        "metrics": {
            "external_api_latency_ms": [140, 210, 1400, 4800, 8500, 9200],
            "http_500_rate_percentage": [0.0, 0.2, 2.1, 12.4, 26.8, 29.5],
            "cpu_usage_percent": [18, 20, 22, 24, 25, 24],
            "memory_usage_percent": [42, 43, 44, 45, 45, 46]
        },
        "commit": {
            "hash": "c4d3e21",
            "author": "payments-dev@company.com",
            "message": "refactor: Update Stripe SDK to v14.2",
            "timestamp": "1 hour ago",
            "diff": "- client = StripeClient(timeout=3.0)\n+ client = StripeClient() # default indefinite timeout"
        }
    },
    ScenarioType.NORTHSTAR_FINANCE_EXPOSURE: {
        "id": ScenarioType.NORTHSTAR_FINANCE_EXPOSURE,
        "title": "Northstar Finance Excessive API Data Exposure",
        "service_id": "northstar-finance",
        "severity": "CRITICAL",
        "description": "Unauthenticated API endpoint /api/profile leaks raw user objects with plaintext passwords and account balances.",
        "affected_service": "northstar-finance",
        "expected_root_cause": "Spread operator { ...u } in server.js line 52 exposing raw user model including plaintext password and role",
        "logs": [
            {"level": "INFO", "source": "northstar-finance", "message": "Server running at http://localhost:3005"},
            {"level": "WARN", "source": "northstar-finance", "message": "Received GET /api/profile?userId=1 from unauthenticated client"},
            {"level": "ERROR", "source": "northstar-finance", "message": "SECURITY_ALERT: Response body contains unmasked field 'password': 'Arjun@123'"},
            {"level": "ERROR", "source": "northstar-finance", "message": "EXPOSED_ENDPOINT: /api/debug and /api/config leaking JWT secret 'northstar-development-secret'"},
        ],
        "metrics": {
            "unauthorized_api_access_count": [10, 45, 120, 450, 1200, 3400],
            "data_exposure_bytes": [450, 1800, 8900, 34000, 98000, 240000],
            "http_200_rate_percentage": [99.5, 99.8, 100.0, 100.0, 100.0, 100.0],
            "cpu_usage_percent": [12, 15, 18, 22, 25, 28]
        },
        "commit": {
            "hash": "c3f81e9",
            "author": "pavanakarthik12",
            "message": "feat: expose profile metadata endpoint and debug config",
            "timestamp": "30 minutes ago",
            "diff": "- res.json({ id: u.id, name: u.name, balance: u.balance });\n+ res.json({ ...u }); // intentional excessive exposure"
        }
    }
}
