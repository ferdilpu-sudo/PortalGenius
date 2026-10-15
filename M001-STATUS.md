# PortalGenius — M-001

**Status final: CLOSED (operator-accepted with documented exceptions), 15 Oktober 2026.**

Bukti terperinci: [M-001 Closeout](docs/milestones/M001-closeout.md) · [ADR-009](decisions.md) · [Tindak lanjut keamanan M-002](https://github.com/ferdilpu-sudo/PortalGenius/issues/2).

## Terverifikasi
- Frontend dan BFF hosted di `https://portalgenius.pages.dev`; API anonim, penolakan origin asing dan username tidak dikenal 4/4 PASS.
- CI npm ci, npm audit 0, TypeScript, 12 tes unit, build PASS.
- Tiga migrasi Supabase applied, enam tabel RLS, penyekatan RPC Auth dari anon/authenticated.
- Bootstrap admin, login, wajib ganti password, logout, login ulang: PASS berdasarkan operasi pengguna dan cek SQL metadata.
- Dua sesi revoked dan nol sesi revoked yang bisa dibaca lewat RPC; SQL deny akses anonim dan authenticated tanpa JWT.

## Diterima sebagai pengecualian, bukan PASS
- Leaked Password Protection nonaktif di paket Supabase saat ini (operator menyatakan perlu Pro).
- Browser/hosted cookie-replay dan refresh paralel NOT RUN.
- Lint/format formal NOT RUN.
- Multi-role RLS, public sign-up configuration test, dan operasi penuh pengguna tahap M-002 NOT RUN.

**PR #1** direncanakan merge ke `main` setelah CI untuk dokumen closeout PASS. M-002 mulai dari [issue #2](https://github.com/ferdilpu-sudo/PortalGenius/issues/2), sebelum penambahan multi-peran atau data siswa nyata.
