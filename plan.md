> **Checkpoint 15 Oktober 2026:** M-001 ditutup atas persetujuan operator, dengan pengecualian keamanan yang didokumentasikan di [closeout](docs/milestones/M001-closeout.md) dan [ADR-009](decisions.md). Pengujian lanjutan wajib dituntaskan sebelum M-002 memperluas akun/role.

# PortalGenius — Rencana Implementasi

Status implementasi 15 Oktober 2026: **M-001 CLOSED (operator-accepted, documented exceptions)**; M-002 hingga M-007 Not started. Penutupan berarti fondasi telah diterima dan diintegrasikan, bukan bahwa semua pengujian keamanan mendatang sudah dijalankan.

## Milestone
| ID | Tujuan/dependensi | Deliverable | REQ | Gate keluar |
|---|---|---|---|---|
| M-001 | Fondasi dan login; tanpa dependensi | Repo baru, skeleton, tokens, Pages API, spike Auth username/sesi, CI | REQ-001, REQ-013 | Build/lint/types; TEST-001 untuk alur login/refresh/logout; HTTPS staging gate bila tersedia |
| M-002 | Akademik dan akses; M-001 | Master, akun/role/reset, kelas/program/periode, assignment | REQ-001, REQ-002, REQ-003, REQ-004 | TEST-001 reset + TEST-002/003/004; direct RLS negatif; akun guru terbatas |
| M-003 | Jurnal dan sesi; M-002 | Wizard, drafts, histori, status/method, konflik/retry | REQ-005, REQ-006, REQ-013 | TEST-005/006/013; jurnal kelas dan individual bekerja |
| M-004 | Nilai; M-002 dan M-003 | Assessment, skor, bobot versi, hasil sementara | REQ-007 | TEST-007; aturan nilai tervalidasi pemilik |
| M-005 | Perkembangan; M-002 dan M-003 | Sikap bulanan, konselor publik/private, role projection | REQ-008 | TEST-008; rubrik dan hak akses dikonfirmasi |
| M-006 | Laporan per siswa; M-003/004/005 | Preview, review, snapshot/revisi, PDF/XLSX, dashboard | REQ-009, REQ-010, REQ-011, REQ-012 | TEST-009/010/011/012, format blanko dan 600 baris terverifikasi |
| M-007 | Pilot dan operasi; M-006 | Hosted internal, backup/restore, aksesibilitas/performance, runbook | REQ-013, REQ-014 | TEST-013/014 dan perjalanan inti seluruh role; operator menyatakan siap |

Audit events dibangun sejak mutation pertama M-001/M-002, bukan baru M-007. Setiap milestone menyertakan schema, pengujian terkait dan doc update. M-007 memverifikasi keseluruhan operasi.

## M-001 — Langkah yang dapat dikerjakan
| Task | Lingkup/path rencana | Hasil dan verifikasi |
|---|---|---|
| TASK-001 | Repository baru, package.json/lockfile, config TS/Vite/Pages | Verifikasi versi resmi kompatibel; pin; scaffolding build dengan script nyata |
| TASK-002 | src/shared/styles, src/shared/ui, src/app | Tokens, shell, login form sintetis, keyboard/360px; tidak membuat semua page palsu |
| TASK-003 | contracts/auth, server/auth, server/platform, functions/api/v1/auth | Pisah validator/resolver/provider/session; uji login alias internal pada provider |
| TASK-004 | supabase/migrations identities/roles/sessions/audit | Deny grants, app session encryption, bootstrap admin lokal, SQL privilege checks |
| TASK-005 | Logout/refresh/password flow | Cookie HttpOnly, lease refresh, CSRF, stale session revoked; TEST-001 |
| TASK-006 | CI dan konfigurasi lingkungan | Lint/type/unit/build; secrets terpisah; production guard; evidence status |

Urutan TASK-001 -> TASK-002 -> TASK-003/004 sesuai dependensi kontrak -> TASK-005 -> TASK-006. Tidak menyimpan kredensial nyata dalam dokumen atau commit. Jika provider/akun belum siap, tandai hosted auth NOT RUN; lanjutkan unit/synthetic UI yang independen, jangan menyebut M-001 Verified.

## Penyelesaian dan dependensi

Tidak ada penundaan M-001 yang diklaim PASS. Pada awal M-002, tangani issue [#2](https://github.com/ferdilpu-sudo/PortalGenius/issues/2) untuk refresh paralel, replay cookie HTTP, lint/format formal, dan perlindungan akses sebelum provisioning multi-peran. Leaked Password Protection khusus tier berbayar diterima sebagai risiko terpisah, tidak mengubah klaim fitur keamanan yang tersedia.

## Rincian increment berikutnya
M-002: semester/year -> master -> enrollment -> assignment -> akun dan reset -> proyeksi/RLS. Validasi archival/last-admin rule. M-003: session DTO -> transaksi -> wizard -> history/conflict -> rekap, validasi OPEN-002. M-004: policy draft/activate -> assessment -> score editor -> missing components -> perhitungan authoritative. M-005: assignment konselor -> rubric -> public/private notes -> completion. M-006: selector -> deterministic report projection -> source revision -> finalize -> revision -> PDF sections -> XLSX -> role dashboard. M-007: recovery/operator -> responsive/a11y -> realistic load -> pilot -> deployment final.

## Risiko dan respons
- Auth username tidak native: selesaikan spike sebelum menambah modul.
- Kuota/free account/hostname belum diketahui: operator verifikasi sebelum hosted; tidak menjanjikan akun baru otomatis menambah hak kuota.
- Aturan nilai/Independence berbeda: validasi sebelum schema modul dikunci, tidak menyimpulkan dari nama saja.
- Ekspor panjang/memori HP: lazy-load exporter, ukur dan pastikan semua halaman/baris; revisi ADR bila perlu.
- Data sensitif: gunakan synthetic sampai role/RLS lulus; jangan masukkan lampiran asli ke repo.
- Tidak tersedia staging terpisah: gunakan local integration dan preview sintetis; tidak memakai DB produksi sebagai test reset.

## Tracker
| Milestone | Status | Bukti |
|---|---|---|
| M-001 | **Closed — accepted exceptions** | CI 12/12 unit PASS, npm audit 0, typecheck/build PASS; tiga migrasi, hosted API 4/4, admin bootstrap/login/password/logout/relogin PASS; sesi revoked ditolak SQL. Lihat [M001 closeout](docs/milestones/M001-closeout.md). Deferred: [#2](https://github.com/ferdilpu-sudo/PortalGenius/issues/2). |
| M-002 | **In progress — M002C1** | M002A+B merged. [PR #5](https://github.com/ferdilpu-sudo/PortalGenius/pull/5): 7 tabel siswa/guru/penugasan RLS, proyeksi role scoped, 32 tes PASS, SQL cross-role rollback PASS, Preview 7/7; provisioning dan authenticated E2E NOT RUN. |
| M-003 | Not started | Menunggu master dan assignment |
| M-004 | Not started | Menunggu model akademik |
| M-005 | Not started | Menunggu penugasan konselor |
| M-006 | Not started | Menunggu sumber laporan |
| M-007 | Not started | Menunggu pilot lengkap |

## Selesai per increment
Perilaku REQ/AC terbukti melalui TEST terkait, file tidak bercampur tanggung jawab, dokumen konsisten, tidak ada secret/data asli, error/empty/loading ditangani. Laporkan hasil aktual dan langkah terkecil berikutnya. Penerapan ke produksi dan perubahan akun eksternal hanya sesuai otorisasi yang diberikan; tugas spesifikasi ini tidak membuat deployment.

[Testing](./testing.md) · [Decisions](./decisions.md) · [AGENTS](./AGENTS.md)