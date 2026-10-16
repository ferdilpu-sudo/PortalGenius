# M-002C2D — Local role-isolation HTTP QA

**Status: CODE READY / WINDOWS DOCKER NOT YET RUN.** Updated 16 October 2026.

This is the next independent gate after Supabase Auth 9/9 PASS and local
PortalGenius BFF session 5-gate PASS. It exercises the real PortalGenius
student/admin projection SQL and HTTP handlers, not a mocked access list.

## Safety boundaries

- Use only a newly created, randomly named temporary Supabase CLI project;
  Docker API bound to `127.0.0.1:55321`, Node BFF QA HTTP server to
  `127.0.0.1:55325`. Both are required; all runs are initiated locally.
- The Windows launcher copies M-001 identity, real M-002 academic catalog,
  M-002C1 relational schema and **actual** student/admin projections, plus
  QA-specific fixture RPCs into the disposable project. The QA helper files
  under `scripts/qa` are **never production database migrations**.
- Production/staging `verifyEnv` continues to require HTTPS and its exact
  Supabase ref. The only loopback exception requires `APP_ENV=local`,
  `EXPECTED_SUPABASE_PROJECT_REF=LOCAL_QA_ONLY`, and exact URL
  `http://127.0.0.1:55321`.
- Six synthetic accounts: admin, teacher A/B, counselor A/B and principal.
  Seven fabricated student records: shared student, teacher A-only,
  teacher B-only, counselor B-only, expired assignment, archived student,
  and unassigned student. No real school records, names, or secrets.
- Fixtures are cleaned up via QA-only RPC and Supabase Auth Admin deletion;
  completion marker is written **after** cleanup. CLI stops only this
  random, disposable Docker project with `stop --no-backup`. Do not use
  `supabase link`, hosted reset, hosted service-role keys or real sessions.

## Windows operator command

In PowerShell with Docker Desktop running:

```powershell
cd "$HOME\Documents\GitHub\PortalGenius-M002C2-QA"
git pull --ff-only origin feat/m002c2-account-provisioning-gates
powershell -NoProfile -File .\scripts\qa-local-auth.ps1 -RoleE2E
```

The `-RoleE2E` option also reruns the 9 Auth provider assertions and the
5-gate BFF session suite. It then checks the local role matrix.

| Actor | Expected `GET /api/v1/students` |
| --- | --- |
| Admin | All six nonarchived students (including expired/unassigned) |
| Teacher A | Shared student and teacher A-only student |
| Teacher B | Teacher B-only student |
| Counselor A | Shared student |
| Counselor B | Counselor B-only student |
| Principal only | HTTP 403, no student data |

Additional negative gates:
- No duplicate or extra ID, no guardian/birth/private attributes: fields
  are exactly `id`, `nis`, `fullName`.
- Attempting `?actorId=<admin>&role=admin` with teacher A's cookie cannot
  broaden scope.
- Account, teacher and assignment master lists: admin HTTP 200 with
  expected fixture counts; all nonadmins HTTP 403.
- Anonymous HTTP student list HTTP 401.
- Anonymous and properly **authenticated** teacher/counselor clients cannot
  read the underlying protected tables directly (students, guardians,
  teaching assignments) via PostgREST.
- Synthetic rows and Auth users must be removed before final PASS.

Expected terminal labels (not evidence until operator runs):

```text
LOCAL_AUTH_PROVIDER_QA_PASS: 9 checks; no hosted project accessed
LOCAL_BFF_SESSION_QA_CLEANUP_PASS: synthetic users removed
LOCAL_BFF_SESSION_QA_PASS: 5 gates; localhost only; no hosted project accessed
LOCAL_ROLE_QA_CLEANUP_PASS: synthetic students, staff and roles removed
LOCAL_ROLE_E2E_QA_PASS: 7 gates; localhost only; no hosted project accessed
LOCAL_AUTH_QA_STOP: stopping only our isolated project
```

Do not share passwords, alias addresses, session cookies, JWTs, local keys,
or the full `supabase status -o env` output. Share only PASS or BLOCKED
labels and error categories.

## Remaining release blockers

Even with a local role-matrix PASS, deployed Cloudflare Pages and hosted
Supabase Auth/signup-off parity, production-like role HTTP testing in an
isolated hosted project, real cookie browser semantics, manual recovery of
uncertain admin reset operations and actual lint/format gates remain OPEN.
Do not merge PR #6 or enable Production provisioning/reset based solely on
local QA. [Tracked in issue #2](https://github.com/ferdilpu-sudo/PortalGenius/issues/2).


## Operator execution — 16 October 2026: cleanup gate BLOCKED

Windows Docker confirmed all existing 9 Auth checks, 5 BFF session gates,
and seven role-isolation checks (including teacher/counselor exact student IDs,
principal 403, actor spoof denial, admin-only master lists and direct PostgREST
denial). However the role suite ended with `LOCAL_ROLE_QA_CLEANUP_FAILED`,
followed by isolated Docker project's STOP message. **No final
`LOCAL_ROLE_E2E_QA_PASS` was produced.**

This run is **NOT PASS** for M-002C2D because synthetic fixture cleanup
was not independently verified. No hosted Supabase or production accounts were
used; the temporary stack is reported stopped.

The next revision adds bounded step diagnostics:
`LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: SCOPES_CLEAR_...`,
`ACTOR_N_UNBIND_...`, and `ACTOR_N_AUTH_DELETE_...`. The tags disclose
only a synthetic step label and a sanitized provider error code, never
DB error messages, credentials, user IDs or tokens. It attempts subsequent
teardown steps even if an earlier step fails and returns FAIL if any are
unconfirmed. Run the same disposable `-RoleE2E` command after updating
the QA clone and share ONLY diagnostic labels. Do not attempt manual
cleanup on Production or LayarBelajar.


## Operator cleanup diagnostic — 16 October 2026, follow-up

Operator reported that all seven local role assertions PASS, while synthetic teardown was still BLOCKED. Bounded labels:

```text
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: SCOPES_CLEAR_ERROR_21000
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: ACTOR_5_UNBIND_ERROR_23503
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: ACTOR_5_AUTH_DELETE_ERROR_UNKNOWN
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: ACTOR_4_UNBIND_ERROR_23503
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: ACTOR_4_AUTH_DELETE_ERROR_UNKNOWN
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: ACTOR_3_UNBIND_ERROR_23503
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: ACTOR_3_AUTH_DELETE_ERROR_UNKNOWN
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: ACTOR_2_UNBIND_ERROR_23503
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: ACTOR_2_AUTH_DELETE_ERROR_UNKNOWN
LOCAL_ROLE_QA_CLEANUP_FAILED
```

PostgreSQL 21000 indicates a cardinality violation during the scoped fixture cleanup.
The later 23503 account deletion failures are consistent with dependent teacher
rows still referencing those accounts, but the **exact failing SQL DELETE step is
not proven** by the error code alone. No production data or real identity was used.

The next branch revision instruments the *local-only* SQL teardown with a fixed,
redacted stage label and SQLSTATE. It now skips unbinding/deleting dependent Auth
accounts if the relational cleanup fails, so cascading 23503 failures are not
confused with independent root causes. SQL RPC atomicity is maintained and no
raw PostgreSQL error messages or secrets are printed.

If the operator next sees
`LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: SCOPES_CLEAR_STAGE_<STEP>_SQLSTATE_<CODE>`,
report only that line, plus `LOCAL_ROLE_QA_CLEANUP_FAILED`. These labels do not
close the gate; they identify the exact local fixture operation to repair.
Production provisioning/reset stays OFF and PR #6 stays Draft.

## Third operator cleanup diagnostic — 16 October 2026

With per-stage SQL diagnostics, the operator confirmed:

```text
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: SCOPES_CLEAR_STAGE_ASSIGNMENT_STUDENTS_SQLSTATE_21000
LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC: ACCOUNT_CLEANUP_SKIPPED_SCOPE_DEPENDENCY
LOCAL_ROLE_QA_CLEANUP_FAILED
LOCAL_AUTH_QA_STOP: stopping only our isolated project
```

Auth provider 9/9, BFF sessions 5-gate and all seven role scope assertions
remain PASS, but role cleanup did not complete, so **M-002C2D remains BLOCKED**.
The error was localized to the first bulk `DELETE` on
`public.assignment_students`. SQLSTATE `21000` alone does not prove
whether the error originated in an expression/trigger or another nested
operation; the earlier FK errors were follow-on failures from uncleaned
relations, not independent role authorization failures.

Next attempt changes ONLY the local-only QA cleanup RPC to delete fixture
records one at a time using their complete primary keys, ordered child-first,
with strict row-existence checks, atomic rollback and sanitized per-row SQLSTATE
diagnostics. This is a candidate remediation, **not yet proven by Docker**.
The test harness remains opt-in local `-RoleE2E` only. No production
migrations, hosted Auth users or live student records were modified.

[CI for the new cleanup approach: 59/59 unit tests, Windows parser, build and
audit PASS](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38866780711).
