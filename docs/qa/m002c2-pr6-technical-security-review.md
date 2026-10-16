# PR #6 — Technical and security review

Date: 16 October 2026. Review scope: staff provisioning, password reset,
Cloudflare Pages runtime classification, administrator UI, Auth/role SQL
boundaries, and the single-production-Supabase release decision.

**Decision: fixes implemented and source CI PASS, but NOT approved for merge
or runtime activation.** All review changes are on the Draft feature branch;
the production Supabase project has not been mutated during this review.

## Findings and remediation

| ID | Severity | Observation | Resolution |
| --- | --- | --- | --- |
| SEC-01 | High | The staging/Preview provisioning helper originally accepted one runtime flag and a non-production Pages hostname without checking whether Preview shared Production Supabase. | Removed ALL Preview write opt-ins. Creation can become available only for the exact canonical Production origin/ref with two explicit reviewed release flags. |
| SEC-02 | High | Preview could also enable the admin password-reset route even though pending/unknown Auth reconciliation has no approved release implementation. | `isStaffPasswordResetEnabled` always returns false; no environment or flag can unlock reset. |
| SEC-03 | Medium | `verifyEnv` accepted canonical Production origin with the environment mislabelled `staging`, and did not enforce exact Production project binding when `APP_ENV=production`. | Added runtime origin/environment and Supabase-ref parity checks. Updated historical academic-year route test fixture to the canonical Production label. |
| SEC-04 | Medium | Staff creation UI trusted any truthy response data, allowing malformed or inconsistent HTTP results to reach the one-time-credential display. | A separate `validateStaffCreationResponse` module checks UUID, requested identity/role, account flags, 40-char temporary password, replay behavior, and 200/201 HTTP status. Malformed replies are treated as uncertain, never success. |

The negative tests cover a Preview connected to Production Supabase,
staging flags, alternative project refs, lookalike origins, mislabelled
Production environments, inconsistent account and credential envelopes, and
replay responses that try to disclose a password twice.

## Additional boundaries reviewed

- The provisioning and reset POST handlers require authenticated app
  sessions, administrator access, matching Origin, CSRF and valid idempotency
  keys before calling privileged Auth/DB APIs.
- Account creation requests allow staff roles only; the server generates
  internal Auth aliases and a one-time random password.
- The account SQL binding RPC is restricted to `service_role`, guards
  administrator role escalation and uses an idempotency journal.
- The reset journal remains locked when Auth results are unknown. No
  reconciler write path has been implemented or activated.
- The Production public `wrangler.toml` contains project identifiers but
  **no server secret keys** and **neither account-creation release flag**.
- Server-side `Cache-Control: no-store` and client `cache: no-store`
  protect API responses from normal HTTP caching. The frontend does not
  write the temporary password to localStorage or logs.

## Evidence (non-mutating)

[GitHub Quality run #38884677644](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38884677644)
**PASS: 91/91 unit tests, 0 failures, typecheck/build, independent security
AST lint, source whitespace gate, pinned JSON Prettier gate, npm audit
0 vulnerabilities and Windows script syntax.** These are code/CI checks,
not evidence of Hosted Auth or live administrative workflows.

Read-only Supabase project inventory performed earlier showed one existing
administrator, no staff accounts, no students, no reset operations and the
expected migrations already applied. The remote project was not changed.

## Unresolved before merging or activation

1. **No hosted QA** by operator decision. Local Docker provider acceptance
   does not prove compatibility of the `@auth.portalgenius.invalid`
   technical alias with hosted Supabase Auth. A real account must not be
   used merely as a disposable synthetic test.
2. Verify hosted Supabase **public signup disabled** in the Auth dashboard
   and record operator evidence without credential disclosure.
3. Supabase Security Advisor reports **leaked password protection disabled**.
   Review remediation:
   https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
4. Confirm recovery/backups, original administrator login, and first real
   staff onboarding/credential handoff procedure before authorizing a
   Production write; scope authorization to one verified staff identity.
5. **Production account creation stays OFF** until a deliberate follow-up
   release decision sets BOTH `ACCOUNT_PROVISIONING_ENABLED=enabled` and
   `ACCOUNT_PROVISIONING_RELEASE=reviewed-v1` on the correct Production
   runtime. The PR does not set them.
6. **Password resets remain OFF in code** pending a separate audited
   unknown/pending reconciliation implementation and acceptance tests.
7. Review code changes and the visible administrator Accounts screen before
   deciding to merge; merge and activation must be separate decisions.

**Release recommendation:** keep PR #6 Draft, record this technical review
and accept no claims of hosted PASS. No account creation or SQL migration
was executed against live Supabase as part of this review.
