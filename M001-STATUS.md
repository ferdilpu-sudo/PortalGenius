# PortalGenius M-001 — bukti terbaru

Tanggal 15 Oktober 2026.

- Kode React/TypeScript, Pages Functions dan autentikasi username ada di branch `feat/m001-foundation-auth`, PR #1 (draft).
- Supabase project khusus `vpglikrkvsnoyjvluigs`. Tiga migrasi telah diterapkan: identitas/sesi, pembatasan akses fungsi RLS, bootstrap satu kali admin.
- 6 tabel RLS dan 11 RPC `pg_auth_*` hanya untuk `service_role`; empat info RLS-without-policy adalah deny-by-default.
- Uji negatif bootstrap identitas Auth tak ada: ditolak; akun aplikasi tetap 0.
- `scripts/bootstrap-admin.mjs` menyediakan operator bootstrap tanpa pendaftaran umum dan tanpa commit password.
- CI menggunakan `npm ci` dan lockfile yang disimpan; TypeScript/test/build PASS di commit sebelum perubahan ini.
- Runbook `docs/deployment/cloudflare-pages-m001.md` dan `scripts/hosted-smoke.mjs` dibuat.
- **OPEN**: akun admin nyata, hosting Cloudflare, secret runtime, negative RLS dengan JWT lintas peran, browser TEST-001 termasuk concurrent refresh/logout/revoke.
- **JANGAN MERGE** PR #1 hingga hosted gate PASS. Periksa pembatasan service_role business data sebelum M-002.

## Bukti hosted 2026-10-15

URL operator: `https://portalgenius.pages.dev`.
Workflow: https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38697975557

- GET `/api/v1/health` => 200 PASS.
- GET `/api/v1/auth/session` tanpa cookie => 401 PASS.
- POST login dengan Origin asing => 503, diharapkan 403 (BLOCKED).
- POST login dengan username sintetis yang tidak ada => 503, diharapkan 401 (BLOCKED).
- Diagnosis: kedua request login melewati `verifyEnv` sebelum langkah lainnya; 503 konsisten dengan konfigurasi server yang hilang/tidak cocok, tetapi belum membuktikan variabel mana yang salah.
- Perbaikan: `AUTH_ALIAS_DOMAIN` dijadikan opsional pada runtime karena hanya dipakai untuk operator bootstrap.
- Tindakan operator: atur variables & encrypted secrets pada **Production** environment proyek Pages (untuk `portalgenius.pages.dev`), deploy ulang, jalankan workflow *Hosted staging smoke* secara manual. Jangan menempelkan secret pada issue/chat/log.
- Hosted TEST-001 tetap OPEN; tidak ada akun admin nyata.


## Hosted verification update — 15 October 2026

GitHub Actions hosted smoke run: https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38697975557 (attempt 3, PASS).

Target: https://portalgenius.pages.dev

| Test | Observed | Result |
| --- | --- | --- |
| GET /api/v1/health | 200 | PASS |
| GET /api/v1/auth/session without cookie | 401 | PASS |
| POST /api/v1/auth/login with foreign Origin | 403 | PASS |
| POST /api/v1/auth/login with nonexistent synthetic username | 401 | PASS |

Supabase read-only check: 0 accounts, 0 login identities, 0 assigned roles. Hosted login with a real administrator, forced password change, refresh concurrency, logout replay, and full negative-RLS TEST-001 remain NOT RUN. No student data or credentials were used in this smoke check. M-001 remains IN PROGRESS and PR #1 remains draft.
