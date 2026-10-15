# PortalGenius M-002C1 — Security foundation, read-only masters

Tanggal: 15 Oktober 2026  
PR: https://github.com/ferdilpu-sudo/PortalGenius/pull/5  
Milestone induk M-002: **IN PROGRESS**.

## Terkirim pada increment ini

- Tabel baru: `teachers`, `students`, `student_guardians`, `enrollments`,
  `teaching_assignments`, `assignment_students`, `counselor_assignments`.
- Semua tabel baru RLS aktif dan deny-by-default untuk `anon`/ `authenticated`.
- BFF scoped student projection `GET /api/v1/students`: admin semua siswa aktif,
  guru hanya peserta penugasan aktif, konselor hanya siswa dampingan aktif;
  principal-only tidak mendapat daftar siswa mentah.
- Proyeksi siswa hanya `id`, `nis`, `fullName`. Tanggal lahir, wali,
  nomor telepon dan catatan pribadi **tidak** masuk DTO.
- BFF admin-only GET `/api/v1/accounts`, `/api/v1/teachers`,
  `/api/v1/assignments`. Username tersedia bagi admin, tetapi email alias
  internal Supabase Auth/password tidak pernah dikeluarkan.
- UI baca saja: Siswa untuk admin/guru/konselor; Guru, Akun dan Penugasan
  hanya untuk administrator. Data creation tidak diaktifkan.

## Pengujian nyata

| Gate | Status | Bukti |
| --- | --- | --- |
| Migrasi SQL inti | Applied | `20261015125808` |
| Proyeksi siswa role-scope | Applied | `20261015125814` |
| Proyeksi admin | Applied | `20261015125821` |
| Cross-role teacher A/B, counselor A/B, principal | PASS dalam SQL rollback | `supabase/tests/m002c_role_scopes_rollback.sql` |
| Penugasan kedaluwarsa/arsip | PASS dalam SQL rollback | Sama |
| Email alias/PII wali di DTO | Tidak terekspos, PASS SQL rollback | Sama |
| Tabel RLS + RPC execution grants | PASS | SQL `has_table_privilege`/`has_function_privilege` |
| Unit/TypeScript/npm audit/build | **32/32 tes PASS**, audit 0, build PASS | [Quality](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38739238709) |
| Cloudflare Preview | **7/7 PASS** (anon GET) | [Preview](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38739234026) |
| Data QA tersimpan | **0** guru, siswa, wali, assignments | SQL read-only setelah rollback |

## Batas dan gate berikutnya

- **Belum lulus:** authenticated multi-role HTTP end-to-end, HTTP cookie replay,
  refresh paralel sungguhan, pengaturan public signup off, password reset/last
  admin safeguard, create/modify akun, input siswa/guru dan penugasan admin.
  Semua wajib diuji sebelum menggunakan data nyata.
- RPC `service_role` hanya boleh dipanggil dari backend BFF dengan actorId
  dari `restoreSession`, bukan dari input pengguna.
- Supabase Leaked Password Protection tetap pengecualian paket yang diterima
  dalam M-001; bukan PASS.
- Jangan menggabungkan status M-002C1 dengan penyelesaian M-002C penuh.

## QA operator setelah merge main

Login ke `https://portalgenius.pages.dev`. Administrator seharusnya melihat
menu Siswa, Guru, Akun, Penugasan. Siswa/Guru/Penugasan kosong; Akun
menampilkan administrator yang sudah ada tanpa menampilkan password/email
alias. Jangan mengisi data siswa sesungguhnya saat ini.
