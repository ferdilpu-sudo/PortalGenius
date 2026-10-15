# PortalGenius M-002

Status: **IN PROGRESS**, tahap pertama **M-002A**.  
PR: https://github.com/ferdilpu-sudo/PortalGenius/pull/3  
Detail bukti: [M002A checkpoint](docs/milestones/M002A-checkpoint.md).

Selesai: schema kalender & katalog kosong dengan RLS tertutup, perbaikan penanganan refresh lease, API dan halaman admin untuk tahun ajaran. CI terbaru: 22 tes PASS, typecheck/build PASS, npm audit 0; SQL rollback dan grants PASS. Hosted login operator masih berjalan pada M-001/main; UI admin baru masih di branch PR.

Gate OPEN: runtime hosted M002A, refresh paralel melalui HTTP, replay cookie yang telah dicabut, lint formal, akun/penugasan guru, data siswa. Lanjutkan issue #2 sebelum provisioning banyak pengguna.
