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
