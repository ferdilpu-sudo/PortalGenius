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

## M-002C1 — landasan keamanan dan master baca saja

[PR #5](https://github.com/ferdilpu-sudo/PortalGenius/pull/5) menambahkan tujuh tabel RLS dan empat endpoint baca sesuai peran. Supabase migrasi diterapkan, SQL rollback cross-role PASS tanpa fixture persisten, GitHub Quality **32/32 PASS**, preview anonim **7/7 PASS**. Penambahan akun/guru/siswa/penugasan dan HTTP multi-role masih NOT RUN. [Lihat checkpoint](docs/milestones/M002C1-checkpoint.md).

## M-002C2A — Provisioning staf (checkpoint)

Operator confirmed M002C1 menus PASS. [PR #6](https://github.com/ferdilpu-sudo/PortalGenius/pull/6) adds atomic, idempotent, admin-only staff account binding plus guarded BFF endpoint. Live SQL rollback and Preview unauthenticated boundary tests PASS, no accounts created. **Account creation stays disabled** on Production; email alias policy, public signup config and session/role end-to-end remain open. [Evidence](docs/milestones/M002C2A-checkpoint.md).

## Keputusan login tanpa email pribadi

Operator mengonfirmasi guru/konselor tidak memiliki email. PR #6 menghapus input email dari kontrak UI/API, menggunakan alias teknis nondeliverable `@auth.portalgenius.invalid` yang dihasilkan backend dari UUID permintaan. Ini **desain yang belum diverifikasi terhadap Supabase Auth hosted**, bukan bukti bahwa provider menerima domain tersebut. Fitur tetap terkunci sampai QA akun sintetis pada proyek terisolasi dan prosedur reset password admin lolos. Tidak ada akun nyata dibuat.

## M-002C2B — Password reset admin tanpa email

Pengembangan reset password staf telah selesai pada branch Draft PR #6 (belum di main). Supabase migration `20261015154828` applied dan SQL rollback keamanan PASS. 51/51 unit PASS, npm audit 0, Preview 7/7 PASS. Satu admin eksisting tidak disentuh; 0 operasi reset persisten. Karena tidak ada QA Supabase terisolasi, kompatibilitas alamat teknis `.invalid` dan Auth create/login/reset/delete masih **NOT RUN**. Production create/reset tetap OFF sampai QA dan prosedur rekonsiliasi tersedia. [Bukti dan risiko](docs/milestones/M002C2A-checkpoint.md).

## QA Auth lokal dengan Docker

Docker Desktop sudah tersedia di komputer operator. PR #6 menambahkan `scripts/qa-local-auth.ps1` dan pemeriksaan URL localhost saja. Runner CI Windows hanya memeriksa sintaks; **Docker Auth QA lokal sudah PASS menurut hasil operator pada 16 Oktober 2026**. Lihat [panduan](docs/qa/m002c2-local-auth-provider.md). Production tetap terkunci.

## Bukti tambahan QA Auth — 16 Oktober 2026

Operator menjalankan pengujian Docker pada Windows dan melaporkan `LOCAL_AUTH_PROVIDER_QA_PASS: 6 checks; no hosted project accessed`. Alamat teknis `.invalid`, login, reset lokal, penolakan password lama, akun sintetis dihapus, dan login sesudah penghapusan ditolak. Stack lokal melaporkan STOP. **PASS lokal tidak berarti PASS hosted.** PR #6 Draft; Production OFF. [Checkpoint](docs/milestones/M002C2A-checkpoint.md).

## QA lanjutan Auth lokal — 16 Oktober 2026

Operator mengonfirmasi `LOCAL_AUTH_PROVIDER_QA_PASS: 9 checks; no hosted project accessed` dan local stack STOP. Mode signup-off dan concurrent provider refresh terhadap akun sintetis **PASS lokal**. Hosted signup OFF, replay cookie aplikasi dan refresh lease HTTP masih belum dibuktikan. PR #6 Draft, Production provisioning OFF.
