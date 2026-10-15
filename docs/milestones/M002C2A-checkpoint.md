# M-002C2A — Staff account provisioning, gated

Tanggal: 15 Oktober 2026  
PR: https://github.com/ferdilpu-sudo/PortalGenius/pull/6  
Status: **IN PROGRESS — no new accounts provisioned; default locked.**

## M002C1 operator acceptance

Operator confirmed `MENU M002C1 PASS`: empty Student/Teacher/Assignment lists and the one administrator account appear as expected on Production main.

## Scope of this increment

- `pg_m002c2_attach_account`: service_role-only atomic linkage of a user that the backend previously created in Supabase Auth. Requires existing active admin, admin-owned Auth user with `managed_by=portalgenius`, confirmed matching Auth alias, normalized unique username, and one of teacher/counselor/principal. **Cannot grant admin role** through routine staff provisioning.
- `pg_m002c2_provision_result`: service_role-only idempotency lookup that compares complete input payload, rejecting key reuse with different username, display name, alias or role.
- Password generated via Web Crypto CSPRNG, 30 random bytes encoded base64url (40 characters). No password supplied by client JSON. Password returned only on successful first completion; retries do not reissue it.
- Supabase Auth created first; atomic database bind second. On error, check idempotency record before considering cleanup. Only delete a new Auth identity when the DB outcome is known not to be committed. Unknown outcome blocks with `PROVISION_RECONCILIATION_REQUIRED`, requiring operator investigation.
- Backend POST `/api/v1/accounts/create`: admin session, Origin, CSRF, idempotency and body validation. **Not exposed in UI**.
- Feature gate `ACCOUNT_PROVISIONING_ENABLED` omitted from `wrangler.toml`. Default disabled. Even if set accidentally, primary Production `https://portalgenius.pages.dev` is hard-blocked in code. Enabling production later requires separate code review.

## Verification

| Gate | Outcome |
| --- | --- |
| SQL rollback: successful link and exact-key retry | PASS |
| Duplicate username / mismatched key | REJECTED |
| Attempt to create administrator role via staff provisioning | REJECTED |
| Non-admin actor and unmanaged/self-signup Auth identity | REJECTED |
| Atomic audit/role/login identity, DB unchanged after rollback | PASS |
| Database migration version | `20261015132818` APPLIED |
| RPC EXECUTE for anon/authenticated | DENIED |
| Live account count | 1 administrator (unchanged) |
| Node unit tests of provisioning, cleanup, unknown outcomes, negative route | PASS in Quality CI |
| Cloudflare Preview, unsigned/anonymous probes | 5/5 PASS |
| Authenticated staff creation in hosted environment | **NOT RUN, intentionally locked** |
| Real new teacher/student account | **NOT CREATED** |

Preview smoke evidence: https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38743208079

## Open decisions and release gates

1. **Email alias strategy:** Supabase Auth needs a technical email identifier even though PortalGenius presents username/password to all users. Prefer a unique verified/recoverable email for each staff member; the email remains internal and does not appear in normal login screens. Do not fabricate addresses on domains the operator does not control. Confirm this policy with the institution before enabling create.
2. Verify Supabase Auth public signup disabled. Current connector does not expose the setting. Operator should confirm in project dashboard.
3. Perform hosted end-to-end role isolation using synthetic teacher A/B, counselor A/B, principal with cleanup; avoid real student data.
4. Execute true concurrent HTTP refresh and replay of revoked cookie under [issue #2](https://github.com/ferdilpu-sudo/PortalGenius/issues/2). Never use the administrator's live cookie for destructive test.
5. Configure separate non-production Preview origin + secrets for authenticated staging, review audit monitoring, then enable account provisioning only there for a bounded test.
6. Build staff creation UI only after gates; then implement student/teacher records and assignment forms with referential date scope and negative tests.
7. Supabase Leaked Password Protection remains an explicitly accepted plan limitation from M-001, **not** a PASS.

This PR should remain Draft. **Do not merge or activate on Production** at this checkpoint.
