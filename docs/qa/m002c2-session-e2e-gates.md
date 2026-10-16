# M-002C2 — BFF session HTTP / multi-role release gate

Status: **NOT RUN**. This document is a test contract, **not** QA evidence.
Updated: 16 October 2026, after local GoTrue provider QA 9/9 PASS.

## Scope

The latest local Docker Auth provider check confirmed technical alias creation,
password update and deletion, disabled anonymous signup and concurrent *GoTrue*
token refresh. It **did not** exercise PortalGenius session cookies, Pages BFF
routes, app sessions SQL version/lease or hosted Auth signup settings.

Until the following test executes against an **isolated synthetic environment**,
do not merge PR #6 as a release-ready feature or enable account create/reset
on production. Do not reuse the administrator's real session or LayarBelajar.

## Required preflight

1. Separate application test origin from Production, with isolated Supabase DB
   and Auth storage. Confirm project ref/env binding cannot point to hosted
   PortalGenius or unrelated environments, and disabled public signup.
2. Create synthetic admin and teacher A/B, counselor A/B and principal only in
   this environment. No real student profiles, names or guardians; use fabricated
   records, short-lived accounts and a deterministic cleanup manifest.
3. Record only status codes, opaque test labels, session version numbers and
   synthetic IDs. Never print cookies, tokens, passwords, Auth aliases or secrets.
4. Require explicit operator confirmation that isolation/cleanup are working
   before any synthetic create operations.
5. Use real POST/GET requests through PortalGenius Pages handlers; only tests
   that go through the actual BFF + local database can close this gate.

## HTTP assertions

| Gate | Preconditions and action | Expected |
| --- | --- | --- |
| Revoke/replay | Login synthetic teacher; GET session, logout with valid Origin/CSRF; replay exact *previous* cookie to GET session | HTTP 401; no prior profile/CSRF returned |
| Parallel refresh | Expiry is near; issue at least 2 simultaneous GET /api/v1/auth/session requests carrying same synthetic cookie | No identity crossover; at most one DB refresh lease owner; other requests wait for committed version; valid sessions resolve to same actor |
| Lease conflict | Hold a synthetic refresh lease and trigger GET session until timeout | Bounded busy/unavailable, never old/wrong credentials, unbounded wait or privilege escalation |
| Refresh/logout race | Hold/rotate token and logout concurrently | All subsequent replay requests denied (HTTP 401); stale refresh cannot resurrect revoked session |
| Password reset | Admin resets synthetic teacher, then replay old cookie | HTTP 401; must_change_password true on fresh sign-in; old password fails |
| Role isolation | Login teacher A/B, counselor A/B, principal and call GET /api/v1/students, accounts, assignments | Teacher/counselor see only active assigned synthetic students; principal bulk student list forbidden; teacher accounts/admin assignment lists HTTP 403 |
| Origin + CSRF | Tamper Origin and X-CSRF-Token on protected mutating route | HTTP 403, no persistent writes |
| Signup-off hosted parity | Anonymous Supabase Auth signUp on isolated provider with signup disabled | Denied; no Auth identity created |
| Cleanup | Delete all synthetic data and Auth users, leave no reset pending | 0 QA fixture rows, 0 tokens logged |

A 503 from an unconfigured Preview backend is **not** evidence of a successful
role/refresh test. Anonymous/Origin-only tests remain separate gates.

## Release decision

Pass requires a machine-readable summary with per-gate evidence and independent
assertion that synthetic data were cleared. A local GoTrue provider PASS or
GitHub unit CI PASS alone does not satisfy these tests.

Open dependencies: isolated BFF test runner and migration strategy, deterministic
fixture teardown, real session replay/refresh concurrency, non-admin hosted role
boundary checks, production public signup setting verification, and operator
reset-pending reconciliation procedure. Tracked by
https://github.com/ferdilpu-sudo/PortalGenius/issues/2.
