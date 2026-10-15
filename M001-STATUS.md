# PortalGenius M-001 — bukti terbaru

Tanggal 15 Oktober 2026.

- Source React/TS, Pages Functions dan autentikasi username ada di branch `feat/m001-foundation-auth`.
- Supabase project khusus: `vpglikrkvsnoyjvluigs`; migrasi `20261015052905` dan `20261015053715` telah diterapkan.
- 6 tabel menggunakan RLS; 10 RPC `pg_auth_*` ditutup dari anon/authenticated; fungsi event trigger juga ditutup.
- Database aplikasi belum memiliki akun atau data siswa.
- CI sebelumnya PASS untuk typecheck, unit test, dan build; kini memakai `npm ci` dari `package-lock.json` yang telah dikomit.
- Gate masih OPEN: bootstrap admin, konfigurasi secrets Cloudflare Pages, browser hosted TEST-001, concurrency refresh/logout/revoke, negative RLS end-to-end.
- Jangan merge PR #1 atau menganggap M-001 Verified sebelum seluruh gate penting teruji.
