# Runbook: Third-Party Payment Gateway Timeouts

## Affected Services
`payment-service`, `checkout-api`

## Symptom
HTTP 504 Gateway Timeout errors spike on checkout. Latency exceeds 8,000ms.

## Root Cause Diagnostics
External Stripe API latency degradation combined with missing HTTP client timeout settings on `StripeClient` causing thread pool saturation.

## Remediation Steps
1. Update `StripeClient` initialization to enforce strict 3.0s connect/read timeouts.
2. Enable circuit breaker pattern with fallback response for transient 504 gateway failures.
3. Restart worker deployment.
