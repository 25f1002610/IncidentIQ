# Runbook: Database Connection Pool Tuning & Troubleshooting

## Affected Services
`user-db-service`, `account-db`

## Symptom
Application logs report `sqlalchemy.exc.TimeoutError: QueuePool limit reached`. Active connections hit 98% threshold with HTTP 500 error rate spikes.

## Root Cause Diagnostics
High-volume nested `JOIN` queries executing without composite index on `(active, created_at)` columns cause slow connection holding times, saturating the max_connections limit of 100.

## Remediation Steps
1. Scale `max_connections` parameter to 250 in PostgreSQL configuration.
2. Execute migration script `004_add_user_search_composite_idx.sql` to add composite index on `(active, created_at)`.
3. Restart application workers to flush stale pool state.
