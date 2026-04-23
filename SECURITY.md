# SECURITY

## Scope

This document covers the security posture of the DRIFT client-side web application within the VERITAS & Sovereign Ecosystem.

## Architecture Security Properties

- **No server-side component.** DRIFT is a fully static, client-side application. There is no backend to compromise, no database to breach, and no API key stored server-side.
- **GitHub PAT handling.** Personal access tokens entered by the operator are held in browser memory for the duration of the active session only. They are not written to `localStorage`, `sessionStorage`, cookies, or any persistent browser store.
- **Minimal token scope.** DRIFT requires only read access to public repository and commit data. The minimum required scope is `public_repo` for public repositories. Private repository access requires `repo` (full read). No write scopes are used or required.
- **Direct API calls only.** All network requests from DRIFT target `api.github.com` exclusively. No third-party analytics, CDN tracking, or telemetry endpoints are contacted.
- **Zero telemetry.** DRIFT collects no usage metrics, error reports, or session data.

## Reporting a Vulnerability

If you discover a security vulnerability in DRIFT, please report it responsibly:

1. **Do not open a public GitHub Issue** for security vulnerabilities.
2. Email **VrtxOmega@pm.me** with the subject line: `[SECURITY] DRIFT — <brief description>`.
3. Include:
   - A description of the vulnerability and its potential impact
   - Reproduction steps (browser, OS, scenario)
   - Any suggested remediation if known

Expected response time: within 72 hours.

## Ecosystem Security

For broader VERITAS & Sovereign Ecosystem security concerns, refer to the [omega-brain-mcp](https://github.com/VrtxOmega/omega-brain-mcp) repository, which governs the VERITAS pipeline and cryptographic audit layer across the Omega Universe.
