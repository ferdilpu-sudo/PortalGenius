# PortalGenius M-002C2 — Auth provider compatibility QA, isolated Docker

## Scope and safety

This tests whether the locally running Supabase Auth provider can accept PortalGenius technical addresses like `pg-<uuid>@auth.portalgenius.invalid`. It also checks sign-in, an administrator password update, old/new password behavior, deletion and rejection after deletion.

- Run **only** on your own Windows PC with Docker Desktop running and Node.js 22+.
- Uses a **new random temporary folder** under the Windows TEMP directory, a unique `project_id` and API port `127.0.0.1:55321`. The GitHub project `supabase/migrations` is **not copied** into this Auth-only test.
- `npx supabase@2.120.0 init`, `start`, `status -o env`, `stop --no-backup` target the **local** stack only. It never calls `supabase login`, `link`, `db push`, `db reset --linked`, or uses hosted keys.
- Local-only keys are kept in child-process environment and never printed or saved to any result file.
- Staging/main Supabase projects and production identities remain **untouched**. Does not simulate PortalGenius business RPC permissions: this is a provider compatibility gate only.
- Docker images may require several gigabytes and initial download can take minutes. Ports 55320–55324 and 55327 must be free. If another stack uses those ports, the script refuses to start instead of stopping other projects.
- On exit, only the freshly created random local test project is stopped and cleared, without `--all`. No user passwords or API keys should be shared in chat.

## Run on Windows PowerShell

From a fresh **copy of the PR branch** (do not mutate your existing main/production worktree):

```powershell
cd "$HOME\Documents\GitHub"
git clone --branch feat/m002c2-account-provisioning-gates https://github.com/ferdilpu-sudo/PortalGenius.git PortalGenius-M002C2-QA
cd .\PortalGenius-M002C2-QA
npm ci
powershell -NoProfile -File .\scripts\qa-local-auth.ps1
```

If you already have this QA clone, use `git fetch origin`, `git checkout feat/m002c2-account-provisioning-gates`, `git pull --ff-only` rather than cloning again.

### Expected outcome

- `LOCAL_AUTH_PROVIDER_QA_PASS: 6 checks; no hosted project accessed` means the **local** GoTrue build accepted technical alias and admin password update. It **does not** prove cloud-hosted Supabase accepts the same domain or that app login works end to end.
- `LOCAL_QA_PROVIDER_REJECTED_ALIAS`: the local provider rejected `.invalid`. Keep PR Draft; revisit auth design; do not substitute Gmail or another organization's domain.
- Docker or port failure: start Docker Desktop, check free ports; do not stop other Supabase projects or change Production.
- Auth cleanup failure: local stack is still removed by the QA runner; inspect local logs if needed. Do not report secrets, passwords or full env output.

## Next gates

Even after local pass, PR #6 stays Draft until a separately approved, isolated **hosted** QA test or documented provider-parity decision, session replay/refresh tests, signup-off verification, reset reconciliation procedure and multi-role scope tests pass. Staff creation/reset remains disabled on Production.

## Operator result — 16 October 2026

Windows Docker QA: `LOCAL_AUTH_PROVIDER_QA_PASS: 6 checks; no hosted project accessed`. The operator verified technical alias acceptance, initial sign-in, admin credential rotation, old credential rejection, new sign-in, synthetic identity deletion, and refusal to sign in after deletion. The isolated local stack reported stopping. **Local provider compatibility PASS. Hosted and multi-role E2E remain NOT RUN.** PR #6 stays Draft and Production provisioning is locked.
