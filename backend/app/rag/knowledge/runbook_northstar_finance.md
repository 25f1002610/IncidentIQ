# Runbook: Northstar Finance Security & Excessive Exposure Diagnostics

## Affected Services
`northstar-finance`, `finance-api`

## Symptom
Automated security audit flags HTTP 200 responses on `/api/profile` leaking plaintext user passwords, admin credentials, and exposed synthetic API keys (`AIzaSyD-NORTHSTAR-7mQ2xK9pL4`).

## Root Cause Diagnostics
Commit `c3f81e9` modified `server.js` line 52 from filtered profile projection `{ id, name }` to spread operator `{ ...u }`, exposing the entire user object including raw `password` strings and role metadata. Additionally, `/api/debug` exposes JWT secrets.

## Remediation Steps
1. Filter `/api/profile` output to project only non-sensitive fields (`id`, `name`, `email`, `balance`).
2. Remove hardcoded API keys and secrets from `server.js` and move them into environment variables (`process.env`).
3. Deploy patch commit and restart Northstar Finance service (`node server.js`).
