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

## M-002C2C — BFF session E2E lokal siap dieksekusi

Branch PR #6 memiliki harness `-SessionE2E` dengan handler HTTP asli (bukan mocking), DB foundation sementara, dan dua akun guru sintetis; output HTTP/logout/parallel refresh/race dibatasi localhost. CI 54/54 PASS; **QA operator belum dijalankan**, sehingga issue #2 replay/refresh belum dapat ditutup. Production tetap OFF. [Kontrak](docs/qa/m002c2-session-e2e-gates.md).

## Operator gate PASS — local BFF Session E2E (16 October 2026)

`LOCAL_AUTH_PROVIDER_QA_PASS: 9 checks`, `LOCAL_BFF_SESSION_QA_CLEANUP_PASS` dan `LOCAL_BFF_SESSION_QA_PASS: 5 gates; localhost only` dilaporkan dari Windows Docker. Enam pemeriksaan individual BFF PASS: login/session HTTP, pemisahan guru A/B, Origin asing 403, replay cookie setelah logout HTTP 401, refresh paralel 1 perubahan versi, lease busy terbatas dan logout replay 401. **Gate BFF lokal PASS**, tetapi hosted/BFF Cloudflare, signup hosted, dan role data siswa lintas peran belum diuji. PR #6 Draft; Production OFF. [Bukti](docs/qa/m002c2-session-e2e-gates.md).

## M-002C2D — Role HTTP QA lokal (siap diuji)

PR #6 menyediakan opsi `-RoleE2E` pada harness Docker yang membuat admin, guru A/B, konselor A/B, kepala sekolah dan tujuh siswa sintetis. Endpoint HTTP siswa dan master diuji memakai proyeksi SQL M-002C1 asli, termasuk penugasan aktif/expired, arsip, spoof actor dan akses tabel langsung. **Belum dijalankan operator; jangan klaim PASS.** [Panduan](docs/qa/m002c2-role-e2e-gates.md). Production tetap OFF.

## M-002C2D — Role QA runtime: akses PASS, cleanup BLOCKED (16 Oktober 2026)

Operator menjalankan `-RoleE2E`: Auth provider 9/9 PASS, BFF session 5-gate PASS, tujuh pemeriksaan hak akses lintas peran PASS. Namun `LOCAL_ROLE_QA_CLEANUP_FAILED` muncul saat menghapus fixture, sehingga **tidak ada final Role E2E PASS**. Stack Docker sementara melaporkan STOP. Perubahan Draft PR #6 menambahkan diagnostik teredaksi per tahap cleanup dan tes regresi. Pengujian ulang operator diperlukan; jangan gabungkan PR atau aktifkan Production. [Bukti dan langkah](docs/qa/m002c2-role-e2e-gates.md).

## Role QA diagnostic 21000 — local-only SQL cleanup candidate (16 Oktober 2026)

Hasil operator terakhir: `SCOPES_CLEAR_STAGE_ASSIGNMENT_STUDENTS_SQLSTATE_21000` dan `ACCOUNT_CLEANUP_SKIPPED_SCOPE_DEPENDENCY`. Semua pemeriksaan keamanan lokal lainnya PASS, tetapi penghapusan fixture **BLOCKED**. PR #6 mengubah hanya fungsi cleanup QA lokal untuk menghapus relasi akademik per kunci primer (anak ke induk), tetap atomik, memberi diagnostik per baris. CI 59/59 PASS; **pengujian ulang Docker belum dilakukan**. Production tetap OFF. [Rincian](docs/qa/m002c2-role-e2e-gates.md).

## M-002C2D — Docker Role E2E local PASS (16 Oktober 2026; hasil operator)

Pengujian ulang operator pada Windows Docker setelah perbaikan local-only cleanup berhasil. Penanda terminal yang dilaporkan:

```text
LOCAL_AUTH_PROVIDER_QA_PASS: 9 checks; no hosted project accessed
LOCAL_BFF_SESSION_QA_CLEANUP_PASS: synthetic users removed
LOCAL_BFF_SESSION_QA_PASS: 5 gates; localhost only; no hosted project accessed
LOCAL_ROLE_QA_CLEANUP_PASS: synthetic students, staff and roles removed
LOCAL_ROLE_E2E_QA_PASS: 7 gates; localhost only; no hosted project accessed
LOCAL_AUTH_QA_STOP: stopping only our isolated project
```

Tujuh gate role isolation dan cleanup fixture sintetis kini **PASS pada Docker lokal**, sehingga blocker local M-002C2D ditutup. Bukti ini berasal dari log eksekusi operator, bukan pengujian hosted. CI commit PR #6: [Quality SUCCESS](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38867033509) (operator melaporkan 59/59 unit tests, build PASS, audit npm 0; workflow Windows syntax PASS). Tidak ada akses hosted/Production dari QA lokal.

**Belum release-ready:** hosted Cloudflare Pages + Supabase QA terisolasi (signup-off, alias teknis, cookie/replay/parallel refresh, negative HTTP multi-role, cleanup), prosedur recovery reset pending/unknown, dan lint/format formal. **PR #6 tetap Draft, fitur create/reset tetap OFF di Production; jangan merge berdasarkan PASS lokal saja.**

## M-002C2E — Hosted QA isolation preflight (16 Oktober 2026)

Branch Draft PR #6 menambahkan guard `hostedQaIdentity`, endpoint `GET /api/v1/qa/environment` (identifier publik, 404 pada Production atau binding salah), dan skrip read-only `scripts/qa/hostedQaPreflight.mjs`. Skrip memeriksa exact Preview origin + Supabase project ref terisolasi serta `/auth/v1/settings` dengan `disable_signup=true` tanpa membuat akun atau melakukan mutasi. Test negative menolak target Production sebelum request dikirim. **Quality CI 65/65 unit PASS, npm audit 0, typecheck/build dan syntax PASS** pada [run 38868957564](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38868957564).

**Gate read-only Hosted E1 belum dieksekusi**, sebab konfigurasi `wrangler.toml` yang ada masih mengarah ke project Supabase Production meskipun `APP_ENV=staging`. Preview yang ada tidak boleh dipakai untuk fixture hosted. Diperlukan proyek Supabase QA dan binding Cloudflare yang benar-benar terpisah. Panduan: [Hosted QA M-002C2E](docs/qa/m002c2e-hosted-parity.md); prosedur [reset pending/unknown](docs/qa/m002c2e-reset-reconciliation.md) masih draft dan belum menyediakan mutasi recovery. Hosted E2E, recovery dan lint/format sungguhan **BLOCKED**. PR #6 tetap Draft dan fitur create/reset tetap OFF di Production.

## M-002C2E — Hosted manual preflight & source quality gates (16 Oktober 2026)

Workflow GitHub Actions **manual-only** disiapkan pada branch PR #6 dengan `contents: read` dan environment `hosted-qa`. Sampai workflow ada di default branch, UI GitHub tidak dapat menjalankannya; jangan merge PR hanya untuk mengaktifkan tombol ini. Skrip preflight lokal read-only dapat digunakan setelah QA Pages + Supabase terpisah tersedia. [Petunjuk Hosted preflight](docs/qa/m002c2e-hosted-preflight-action.md).

Quality CI [run 38870055207](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38870055207) **PASS**: 69/69 unit tests, pemeriksaan AST lint keamanan terpisah dari typecheck, source whitespace format checks, typecheck, build, Windows syntax dan npm audit 0. Ini **bukan pengganti** lint/formatter standar (ESLint/Biome/Prettier) dan tidak menutup gate quality sepenuhnya. QA hosted E1/E2 belum dijalankan; proyek Supabase QA terisolasi belum tersedia. PR #6 tetap Draft, account create/reset Production OFF.

## M-002C2E — Quality + reset read-only classifier (16 Oktober 2026)

Draft PR #6 sekarang mencakup modul `server/accounts/classifyResetReconciliation.ts`
dengan keputusan **fail-closed** untuk reset password tidak pasti. Modul
hanya mengklasifikasikan bukti peran, akun, audit, sesi, dan operasi; **tidak
dapat mengungkap password, melakukan retry, atau mengubah ledger reset**.
Mekanisme pemulihan reset yang melakukan mutasi tetap **BLOCKED** dan hanya
boleh diuji di proyek QA terisolasi setelah persetujuan operator.

Lint AST keamanan + whitespace format source tetap menjadi blocking CI.
Sebagai format standar bertahap, `prettier@3.6.2` kini dipin dalam
`package.json` dan `package-lock.json`, dengan Prettier check pada tiga
file JSON konfigurasi. **Bukan** formatter repo-wide atau ESLint penuh.
[Quality CI 38878649233](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38878649233)
**PASS (77/77 tes, Prettier PASS, typecheck/build PASS, audit 0)**.
Hosted E1/E2 tetap NOT RUN karena tidak ada Supabase QA + Cloudflare QA
terisolasi, sementara PR #6 tetap Draft dan fitur Production create/reset OFF.

## M-002C2E — Hosted QA project quota BLOCKED (16 Oktober 2026)

Operator menyetujui biaya **US$0/bulan** untuk proyek Supabase `portalgenius-qa`, organisasi terhubung, region `ap-northeast-1`. Pemeriksaan biaya Supabase `get_cost` mengembalikan monthly amount `0`, lalu `confirm_cost` sukses. Namun, panggilan `create_project` ditolak oleh Supabase karena pemilik organisasi telah mencapai batas **2 active free projects**. Pemeriksaan ulang `list_projects` menampilkan hanya dua proyek semula: `Portal Genius` dan `layarbelajar-staging`, keduanya aktif; **tidak ada proyek QA baru dibuat**.

**Keputusan keamanan:** jangan menjeda/menghapus salah satu proyek yang ada, tidak meng-upgrade organisasi dan tidak menggunakan proyek Production ataupun LayarBelajar sebagai Hosted QA. E1 Hosted preflight dan E2 synthetic hosted E2E tetap **BLOCKED** sampai kapasitas QA independen tersedia dengan persetujuan operator. PR #6 tetap Draft dan akun create/reset Production OFF. CLI/Docker QA lokal sebelumnya tetap menjadi bukti terpisah, bukan Hosted PASS.

## M-002C2F — Single-project PortalGenius Production (16 Oktober 2026, keputusan operator)

Operator memutuskan **tidak menggunakan proyek Supabase QA hosted terpisah**.
Implementasi berlanjut pada proyek Supabase **Portal Genius** yang sudah ada
(`vpglikrkvsnoyjvluigs`), tanpa memindahkan, menghapus atau menjeda proyek
`layarbelajar-staging`. Percobaan membuat `portalgenius-qa` telah gagal
karena batas dua proyek gratis; tidak ada proyek QA yang tersisa.

Pemeriksaan Supabase remote **read-only** mengonfirmasi proyek
`ACTIVE_HEALTHY`, migrasi M-001 sampai M-002C2 tercatat applied, dan
inventaris dasar **1 akun administrator, 0 staf, 0 siswa, 0 operasi reset**.
Tidak ada akun, data akademik, Auth credential ataupun SQL production
yang dimutasi dalam checkpoint ini. Security Advisor masih melaporkan
RLS-without-policy (deny-by-default yang perlu direview) dan leaked
password protection disabled (risiko yang telah dicatat).

Branch PR #6 sekarang mengoreksi `wrangler.toml` menjadi
`APP_ENV=production` untuk `https://portalgenius.pages.dev`,
menambahkan halaman admin pembuatan staf username-only, endpoint capability
read-only khusus admin, pemisahan feature gate create vs reset, dan tes
negatif tambahan. Fitur penciptaan akun Production **default OFF**;
memerlukan dua opt-in runtime yang tidak ditulis di repo:
`ACCOUNT_PROVISIONING_ENABLED=enabled` dan
`ACCOUNT_PROVISIONING_RELEASE=reviewed-v1` beserta exact origin/proyek.
**Jangan mengaktifkannya sebelum code review, backup/recovery, dan keputusan
rilis operator yang terpisah.** Password reset Production tetap OFF secara
eksplisit meski create nantinya diaktifkan; pending reset recovery belum siap.

Tidak ada klaim PASS hosted QA, sebab operator memilih untuk tidak
menjalankan gate itu. CI unit/build dan local Docker E2E adalah bukti
tersendiri; test otomatis destruktif tidak boleh dijalankan pada database
Production. PR #6 tetap **Draft** dan perubahan UI masih di branch, belum
berada di aplikasi live. Prosedur:
[Single-project rollout](docs/operations/portalgenius-single-project-rollout.md).

## M-002C2F — PR #6 security review hardening (16 Oktober 2026)

Review kode menemukan akses mutasi Preview dengan flag staging yang tidak
membuktikan isolasi database, termasuk jalur reset password; keduanya
**ditutup**. Fungsi pembuatan akun kini hanya menerima dua opt-in untuk
origin/ref Production yang persis benar, sedangkan reset password selalu
OFF. `verifyEnv` mengikat nama environment Production dengan host dan
project ref Supabase yang tepat. Frontend memvalidasi respons akun dan
password sementara secara ketat sebelum ditampilkan, termasuk idempotent
replay. Regression test negatif untuk semua jalur tersebut sudah dibuat.

[Dokumen audit teknis PR #6](docs/qa/m002c2-pr6-technical-security-review.md).
[GitHub CI #38884677644](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38884677644)
**PASS: 91/91 unit, typecheck/build, AST security lint, Prettier terbatas,
npm audit 0, dan Windows parser** pada perubahan kode hasil review.
Review dokumentasi berikutnya tetap harus menjalankan CI; tidak ada mutasi
Supabase hosted. **Draft PR tidak di-merge**, flag create Production tetap
tidak diatur, reset Production masih dikunci. Validasi Auth alias di hosted,
public signup off, backup/recovery dan verifikasi tampilan nyata tetap
memerlukan pemeriksaan tersendiri.

## M-002C2F — Hardened shared write boundary & production read-only preflight (16 Oktober 2026)

Pada audit lanjutan, helper `isTrustedMutation` ditemukan belum
memvalidasi **origin URL tujuan permintaan**; header Origin/Referer
saja tidak cukup ketika Cloudflare Preview mewarisi konfigurasi Production.
Helper bersama telah diperbaiki sehingga semua mutasi yang memakainya
harus memiliki target URL yang persis sama dengan `APP_ORIGIN`.
`verifyEnv` juga memblokir kombinasi `APP_ENV=staging` dengan ref
Supabase PortalGenius Production pada seluruh runtime.

Script `scripts/qa/productionReadOnlyPreflight.mjs` ditambahkan
sebagai pemeriksaan dua GET saja: kesehatan API Production dan
`/auth/v1/settings` Supabase yang wajib menampilkan
`disable_signup=true`. CLI tersedia lewat
`npm run qa:production:readonly`, membaca hanya nilai publik
`wrangler.toml`, tanpa service-role key, tanpa perubahan database/akun.
**CLI live belum dijalankan; hasil unit test stub fetch bukan bukti
konfigurasi hosted.** Jika semua GET berhasil, itu pun tidak memverifikasi
cadangan database atau variabel deployment runtime.

[Quality CI 38916953736](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38916953736)
**PASS: 101/101 unit, lint AST, format, typecheck, build, audit 0,
PowerShell syntax** pada perubahan kode. PR #6 tetap Draft.
Tidak ada migrasi, fixture, reset, atau provisioning pada Production;
kedua flag create tetap tidak terpasang dan reset selalu OFF.
[Laporan review](docs/qa/m002c2-pr6-technical-security-review.md).
