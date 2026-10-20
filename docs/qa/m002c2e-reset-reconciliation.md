# M-002C2E — Admin reset pending/unknown reconciliation

Status: **PROCEDURE DRAFT / MUTATING RECOVERY BLOCKED**.
The current SQL ledger admits only `pending` and `completed` states.
An uncertain Auth Admin password update does **not** prove the new password
was applied, and a failure to complete the database ledger does **not** prove
the Auth password update failed.

## Preconditions (isolated QA only)

- Confirm the specific target is a **synthetic** account in a separately
  verified non-Production Supabase QA project, and that the Pages app binds
  to that exact project (see `m002c2e-hosted-parity.md`).
- Require an authorized admin and a separate reviewer for case ownership.
  Identify the affected operation from the request's UUID and audit request
  ID, **never** from a name, username substring or unverified message.
- Record redacted operation IDs, times, states, and approval in a restricted
  operator incident record. Do not copy passwords, Auth credentials, service
  keys, cookies or tokens into tickets or logs.
- Freeze all further resets for the affected account. Ensure
  `must_change_password` remains true and app sessions remain revoked.
  Do not delete or re-create the staff identity; this would break academic
  assignments, audits and idempotency.

## Read-only triage

Using an authorized, read-only operator session in the *isolated QA* project,
verify the pending row in `private.staff_password_reset_ops`, the exact
`actor_id`, `target_id` and `request_id`, account active/role flags,
Auth managed-by metadata and audit trail. Check that the account has the
expected technical email identity and is **not** an administrator.

Compare evidence from BFF operation stage, Auth provider response, and
the SQL completion result. If any step is absent, timed out or contradictory,
classify it as `UNKNOWN`; never infer success from a network timeout.

| Observed condition | Safety decision |
| --- | --- |
| Begin failed or never committed | Do not assume an operation is pending; verify DB state before any retry |
| Pending + Auth update failed or timed out | Keep pending; do not hand out a temporary password |
| Pending + Auth update reported success, SQL completion unknown | Keep pending; do not claim reset success or repeat the old password |
| Completed row + independently verified completion audit | Keep the completed record; confirm required password-change and session-revocation policy |
| Ledger, Auth user, or role does not match expected account | Stop, escalate to manual identity and data-integrity review |

## Recovery design gate — not implemented

A future operator-only recovery procedure must permit a **fresh random
credential rotation** only after dual approval and an explicit, audited
resolution of the old pending operation. It must not simply mark the old
password as known or replay an unknown temporary credential. Design and
test a service-role-only, strict-account-bound, monotonic ledger transition
(such as `superseded`) with transaction-safe audit, then run negative SQL
rollback tests before enabling it. The current enum/check constraint
(`pending`/`completed`) has no approved `superseded` path.

There is intentionally **no direct SQL UPDATE, DELETE or API bypass**
provided in this runbook. Never override this lock on Production, call
`pg_m002c2_complete_staff_password_reset` without a verified Auth update,
or modify a pending row manually to satisfy a release gate.

## Release decision

This document clarifies what is safe to inspect, **not** an executable
recovery mechanism. Treat the reset reconciliation gate as BLOCKED until
an isolated QA recovery implementation, negative authorization tests,
cleanup and an operator-approved hosted run all PASS. Leave the PR Draft
and keep Production account creation/reset disabled.

## Read-only classifier acceptance — 16 October 2026

Branch Draft PR #6 now contains a pure, read-only classifier in
`server/accounts/classifyResetReconciliation.ts` and negative tests in
`tests/unit/resetReconciliation.test.mjs`. **It is not a recovery endpoint
and is not wired to a hosted credentials operation.** The data record passed
to it must come from an authorized, independently verified QA audit context.

| Classifier status | Meaning / required disposition |
| --- | --- |
| `EVIDENCE_MISSING` | Essential operation/account/audit evidence absent: block |
| `IDENTITY_MISMATCH` | Operation, actor or target mismatch: escalate |
| `INVARIANT_VIOLATION` | Staff role, managed Auth identity, change flag, session revocation or audit contradiction: escalate |
| `PENDING_MANUAL_REVIEW` | Ledger still pending regardless of Auth provider response: hold |
| `COMPLETED_MANUAL_REVIEW` | Ledger claims completion with consistent audit; verify independently before closure |

Every result sets `permitsPasswordDisclosure=false`,
`permitsAutomaticRetry=false`, and `permitsLedgerMutation=false`.
The classifier cannot authorize a retry or clear an uncertain state.
Pending/unknown reconciliation remains BLOCKED until a separately designed,
audited recovery mutation and synthetic hosted QA are accepted.

Code-only CI evidence: [Quality run 38878406423](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38878406423)
**PASS, 77/77 tests**, with all eight new classifier tests passing.
