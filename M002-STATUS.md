# PortalGenius M-002

Status: **IN PROGRESS**, tahap pertama **M-002A**.  
PR: https://github.com/ferdilpu-sudo/PortalGenius/pull/3  
Detail bukti: [M002A checkpoint](docs/milestones/M002A-checkpoint.md).

Selesai: schema kalender & katalog kosong dengan RLS tertutup, perbaikan penanganan refresh lease, API dan halaman admin untuk tahun ajaran. CI terbaru: 22 tes PASS, typecheck/build PASS, npm audit 0; SQL rollback dan grants PASS. Hosted login operator masih berjalan pada M-001/main; UI admin baru masih di branch PR.

Gate OPEN: runtime hosted M002A, refresh paralel melalui HTTP, replay cookie yang telah dicabut, lint formal, akun/penugasan guru, data siswa. Lanjutkan issue #2 sebelum provisioning banyak pengguna.

## Cloudflare Pages preview verification

Cloudflare bot identified preview URL https://feat-m002-security-master-fo.portalgenius.pages.dev for PR #3.
GitHub Actions: https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38730497319 — **PASS 4/4**.

- HTML page: 200 PASS.
- API health: 200 PASS.
- GET `/api/v1/academic-years` without cookie: 401 PASS.
- Unknown API path: 404 PASS.

No authenticated admin mutation on preview was executed. Browser master-data write/refresh-concurrency remain NOT RUN. The Preview environment may require independent secret configuration; never copy values into source. This checkpoint is appropriate for an incremental integration but **does not close M-002**.

## M-002B — semester dan katalog (15 Oktober 2026)

PR #4 menambahkan modul Semester, Program, Mata Pelajaran, dan Kelas. Tiga fungsi RPC sudah diterapkan dan audit SQL rollback PASS tanpa data persisten. Versi migrasi GitHub diselaraskan dengan Supabase. Preview Cloudflare: 14/14 anonymous/Origin tests PASS (attempt 2) setelah perbaikan fail-closed pada request anonim. Read/write authenticated admin belum diuji pada Preview/Production. [Detail bukti](docs/milestones/M002B-checkpoint.md).
