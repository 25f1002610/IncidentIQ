# Runbook: Node.js & Memory Leak Diagnostics

## Affected Services
`auth-service`, `session-api`

## Symptom
Node.js Heap memory consumption steadily climbs post-deployment, eventually triggering K8s `OOMKilled` exit code 137.

## Root Cause Diagnostics
Unclosed database session handles in authentication middleware or JWT refresh token handlers introduced in commit `a8f9c12`.

## Remediation Steps
1. Roll back deployment release to commit prior to `a8f9c12`.
2. Ensure all session instantiations use `try/finally` context managers with explicit `session.close()`.
3. Restart pod replicas.
