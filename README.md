# PortalGenius

Aplikasi administrasi akademik internal satu lembaga homeschooling (SD, SMP, SMA).

## Status proyek — 15 Oktober 2026

- **M-001 Fondasi dan autentikasi: CLOSED** (disetujui operator dengan pengecualian terdokumentasi). [Bukti closeout](docs/milestones/M001-closeout.md) · [ADR-009](decisions.md).
- **M-002 Master Akademik dan Otorisasi:** berikutnya, belum dimulai. [Gate keamanan awal M-002](https://github.com/ferdilpu-sudo/PortalGenius/issues/2).
- **Hosted staging:** https://portalgenius.pages.dev — login administrator, ganti password awal, logout, relogin sudah dilaporkan PASS oleh operator.
- **Stack:** React/TypeScript/Vite, Cloudflare Pages Functions (BFF same-origin), Supabase Auth/Postgres dengan RLS, sesi cookie HttpOnly Secure.
- **Lingkungan:** database khusus Supabase `vpglikrkvsnoyjvluigs`. Jangan menyentuh proyek LayarBelajar atau menyalin data lama.

## Pengembangan

Gunakan Node.js 22+, lalu:

```bash
npm ci
npm run preflight
npm run typecheck
npm test
npm run build
```

GitHub CI juga melakukan `npm audit --audit-level=high` serta pemeriksaan sintaks bootstrap Windows. Tidak ada rahasia/identitas pengguna yang boleh masuk source, log, atau bundle. [Panduan Pages dan operator](docs/deployment/cloudflare-pages-m001.md).

Untuk tahap M-002, jangan menganggap CI source code menggantikan tes negatif RLS dan hosted E2E. [Pedoman agent](AGENTS.md), [arsitektur](architecture.md), [rencana](plan.md), [strategi tes](testing.md).

**Keamanan:** layanan Supabase saat ini belum mengaktifkan fitur Leaked Password Protection karena pembatasan paket sebagaimana disampaikan operator; temuan advisor dicatat sebagai risiko yang diterima. Uji refresh paralel, replay cookie HTTP, dan formal lint adalah pekerjaan tertunda dengan pelacakan di issue #2. Tidak ada klaim seluruh sistem atau modul M-002..M-007 siap produksi.

## Pengembangan M-002

M-002A sedang dikerjakan di [PR #3](https://github.com/ferdilpu-sudo/PortalGenius/pull/3). Skema katalog dasar telah dibuat dengan RLS deny-by-default. Fitur administrator tahun ajaran di PR belum tersedia pada `main` sampai pengujian hosted/lifecycle selesai. Gunakan [M002A checkpoint](docs/milestones/M002A-checkpoint.md) untuk status yang tepat.
