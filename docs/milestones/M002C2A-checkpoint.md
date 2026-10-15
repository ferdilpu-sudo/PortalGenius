# M-002C2A — Staff account provisioning, gated

Tanggal: 15 Oktober 2026  
PR: https://github.com/ferdilpu-sudo/PortalGenius/pull/6  
Status: **IN PROGRESS — no new accounts provisioned; default locked.**

## M002C1 operator acceptance

Operator confirmed `MENU M002C1 PASS`: empty Student/Teacher/Assignment lists and the one administrator account appear as expected on Production main.

## Scope of this increment

- `pg_m002c2_attach_account`: service_role-only atomic linkage of a user that the backend previously created in Supabase Auth. Requires existing active admin, admin-owned Auth user with `managed_by=portalgenius`, confirmed matching Auth alias, normalized unique username, and one of teacher/counselor/principal. **Cannot grant admin role** through routine staff provisioning.
- `pg_m002c2_provision_result`: service_role-only idempotency lookup that compares complete input payload, rejecting key reuse with different username, display name, alias or role.
- Password generated via Web Crypto CSPRNG, 30 random bytes encoded base64url (40 characters). No password supplied by client JSON. Password returned only on successful first completion; retries do not reissue it.
- Supabase Auth created first; atomic database bind second. On error, check idempotency record before considering cleanup. Only delete a new Auth identity when the DB outcome is known not to be committed. Unknown outcome blocks with `PROVISION_RECONCILIATION_REQUIRED`, requiring operator investigation.
- Backend POST `/api/v1/accounts/create`: admin session, Origin, CSRF, idempotency and body validation. **Not exposed in UI**.
- Feature gate `ACCOUNT_PROVISIONING_ENABLED` omitted from `wrangler.toml`. Default disabled. Even if set accidentally, primary Production `https://portalgenius.pages.dev` is hard-blocked in code. Enabling production later requires separate code review.

## Verification

| Gate | Outcome |
| --- | --- |
| SQL rollback: successful link and exact-key retry | PASS |
| Duplicate username / mismatched key | REJECTED |
| Attempt to create administrator role via staff provisioning | REJECTED |
| Non-admin actor and unmanaged/self-signup Auth identity | REJECTED |
| Atomic audit/role/login identity, DB unchanged after rollback | PASS |
| Database migration version | `20261015132818` APPLIED |
| RPC EXECUTE for anon/authenticated | DENIED |
| Live account count | 1 administrator (unchanged) |
| Node unit tests of provisioning, cleanup, unknown outcomes, negative route | PASS in Quality CI |
| Cloudflare Preview, unsigned/anonymous probes | 5/5 PASS |
| Authenticated staff creation in hosted environment | **NOT RUN, intentionally locked** |
| Real new teacher/student account | **NOT CREATED** |

Preview smoke evidence: https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38743208079

## Open decisions and release gates

1. **Email alias strategy (operator answered: staff have no emails):** no personal or institution-owned staff email is required in the UI. The backend proposes deterministic per-request identities `pg-<uuid-without-hyphens>@auth.portalgenius.invalid` using the RFC 2606 reserved, non-deliverable `.invalid` domain. This is a technical Auth identifier, **not a verified mailbox** and not a recovery channel. The account creation form accepts only username, displayName and role. **Supabase GoTrue acceptance of .invalid has not been verified in hosted Auth**; do not enable provisioning until a bounded test in an isolated QA project confirms create/login/delete. If rejected, stop and revisit the backend identity architecture: do not fabricate Gmail accounts or substitute a real third-party domain.
2. Verify Supabase Auth public signup disabled. Current connector does not expose the setting. Operator should confirm in project dashboard.
3. Perform hosted end-to-end role isolation using synthetic teacher A/B, counselor A/B, principal with cleanup; avoid real student data.
4. Execute true concurrent HTTP refresh and replay of revoked cookie under [issue #2](https://github.com/ferdilpu-sudo/PortalGenius/issues/2). Never use the administrator's live cookie for destructive test.
5. Configure separate non-production Preview origin + secrets for authenticated staging, review audit monitoring, then enable account provisioning only there for a bounded test.
6. Build staff creation UI only after gates; then implement student/teacher records and assignment forms with referential date scope and negative tests.
7. Supabase Leaked Password Protection remains an explicitly accepted plan limitation from M-001, **not** a PASS.

This PR should remain Draft. **Do not merge or activate on Production** at this checkpoint.

## Keputusan emailless — 15 Oktober 2026

Pengguna menegaskan bahwa setiap guru dan konselor **tidak memiliki email**. Kontrak API di PR #6 diperbarui: `authEmail` dan `email` ditolak jika dikirim dari browser. Backend sendiri menghasilkan alias unik memakai kunci idempotensi UUID dan domain RFC-reserved `.invalid`. Login PortalGenius tetap berbasis username dan password melalui pemetaan internal Auth.

**Batasan keamanan dan operasional:** tidak ada pengiriman email, undangan, tautan reset, OTP email, atau pemulihan otomatis untuk staf. Perlu dibuat prosedur **reset password oleh administrator** (verifikasi identitas manual, password sementara acak, wajib ganti saat login, pencabutan semua sesi, audit, pembatasan percobaan). Identitas staf harus bisa dinonaktifkan dan dipulihkan tanpa mengubah NIS/relasi penugasan. Prosedur *last-admin recovery* harus didokumentasikan secara terpisah.

**Belum diuji**: kompatibilitas email `.invalid` pada Supabase Auth yang sebenarnya. Jangan klaim address teknis diterima hingga pengujian QA terisolasi lulus. Penutupan PR/Draft tetap diblokir. Referensi teknis: https://supabase.com/docs/reference/javascript/auth-admin-createuser dan https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid.

## M-002C2B — Reset password oleh administrator tanpa email (15 Oktober 2026)

Operator memilih mode akun staf tanpa email. Pemulihan password tidak menggunakan link email ataupun OTP email.

### Implementasi
- `private.staff_password_reset_ops` adalah jurnal dua fase (pending/completed), dengan RLS deny-by-default dan satu operasi pending maksimum per pengguna.
- `pg_m002c2_begin_staff_password_reset` hanya bisa dijalankan service_role untuk target non-admin PortalGenius aktif yang beridentitas teknis. Ia memeriksa admin operator, mengecualikan reset diri, mewajibkan target punya role staf, menandai `must_change_password=true`, mencabut sesi aplikasi target, serta mencatat audit dalam satu transaksi.
- `pg_m002c2_complete_staff_password_reset` mencatat audit selesai setelah backend menerima sukses dari Supabase Auth Admin password update. Reuse operasi atau operasi yang bukan milik actor ditolak.
- `POST /api/v1/accounts/reset-password`: Origin, sesi login, CSRF, role admin, feature gate sama dengan provisioning. Tidak ada tombol UI. Fitur **OFF** pada Production, bahkan bila variable opt-in keliru diisi.
- Password sementara CSPRNG hanya dikembalikan setelah operasi `complete` berhasil. Timeout/failure mempertahankan operasi pending, tidak mengungkap password yang belum bisa dijamin berlaku, dan membutuhkan peninjauan manual.

### Bukti verifikasi

- Migrasi Supabase `20261015154828_m002c2_staff_password_reset`: **APPLIED**.
- SQL rollback setelah penerapan migrasi: nonadmin rejected, admin self-reset rejected, revoked old app session, must-change flag, one pending per target, double-complete rejected, dua event audit, privileges denied untuk anon/authenticated: **PASS**. Satu administrator nyata tetap tidak disentuh.
- Supabase read-only: 1 akun saat ini, 0 reset operations tersimpan.
- CI terbaru [Quality 51/51 unit PASS, npm audit 0, build PASS](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38763749032).
- Cloudflare Preview [7/7 PASS](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38763738523): HTML, health, accounts anon, origin asing + no-cookie untuk provision dan reset. Tidak ada mutasi terhadap akun nyata.

### Gate yang masih BLOCKED / NOT RUN

1. **Kompatibilitas Supabase Auth dengan `@auth.portalgenius.invalid`: NOT RUN**. Saat ini tidak terdapat proyek Supabase QA terisolasi; ada dua proyek terhubung (PortalGenius dan LayarBelajar staging). **Jangan uji Auth create/update/delete pada salah satu proyek utama itu** tanpa rencana lingkungan QA terpisah. Jika alias ditolak provider, ubah desain secara aman daripada menggunakan domain email pihak lain.
2. Pengujian backend penuh end-to-end dengan akun sintetis guru A/B, konselor, principal; create + login + password change + reset + cleanup pada QA: NOT RUN.
3. HTTP cookie replay setelah revoke, true concurrent refresh, public signup disabled: NOT RUN ([issue #2](https://github.com/ferdilpu-sudo/PortalGenius/issues/2)).
4. Workflow recovery manual untuk operasi reset yang pending/unknown: desain fail-closed tersedia, tetapi prosedur rekonsiliasi eksplisit belum dibuat. Jangan aktifkan reset sampai siap.
5. Staff create UI, guru/siswa, class/enrollment/assignment mutasi: NOT RUN. Data siswa nyata tetap dilarang sebelum gate role isolation.

**Keputusan:** PR #6 tetap **Draft**. Migrasi telah diterapkan tanpa mengubah akun aktif; kode fitur account provisioning/reset hanya ada pada branch. Jangan mengaktifkan `ACCOUNT_PROVISIONING_ENABLED` di Production.

## QA lokal menggunakan Docker Desktop (15 Oktober 2026)

Operator telah memastikan Docker Desktop tersedia. Script Windows `scripts/qa-local-auth.ps1` dengan panduan [isolated QA](../qa/m002c2-local-auth-provider.md) sudah ditambahkan.

- Membuat proyek Supabase sementara terpisah dengan project ID unik dan API di `http://127.0.0.1:55321`; tidak ada Supabase login, link, db push atau kredensial produksi.
- Enam uji Auth provider: pembuatan technical alias `.invalid`, login, update password, penolakan password lama, login baru, hapus akun dan penolakan login setelah penghapusan (enam checkpoint keseluruhan; penghapusan dan pasca-penghapusan diuji sebagai langkah terpisah).
- Kunci CLI dari `supabase status -o env` hanya digunakan di proses lokal; tidak boleh dibagikan ke chat atau GitHub.
- CLI QA hanya menghentikan project sementara miliknya sendiri dengan `supabase stop --no-backup`, bukan proyek lokal lain.
- CI Node serta parser PowerShell Windows sudah lulus. **Operator belum menjalankan QA Docker sungguhan; gate provider masih NOT RUN.**

Production provisioning dan reset tetap dikunci; PR #6 Draft.
