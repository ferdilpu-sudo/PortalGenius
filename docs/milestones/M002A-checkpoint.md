# PortalGenius — M-002A checkpoint

Tanggal: 15 Oktober 2026  
Status: **IN PROGRESS — source and SQL gates PASS; hosted admin API NOT RUN**  
PR: https://github.com/ferdilpu-sudo/PortalGenius/pull/3  
Target Cloudflare production branch: `main`

## Selesai dalam branch

| Lingkup | Status | Bukti |
|---|---|---|
| Concurrent refresh lease bounded version wait | Unit PASS | 3 tes deterministik |
| Cloudflare hosted synthetic guards (logout, password, unknown cookie) | Source ditambah, hosted NOT RUN | `scripts/hosted-smoke.mjs` |
| Academic catalog schema | Applied | `20261015183000_m002_academic_catalog_foundation.sql` |
| Tabel RLS | 7 baru, akses langsung anon/authenticated ditolak | Supabase live SQL |
| Tahun ajaran mutation | Admin-only RPC, idempotency key, audit atomik, overlap guard | Transaksi SQL rollback PASS |
| Admin API | GET dan POST `/api/v1/academic-years` | Route unit tests PASS |
| UI | Form dan daftar tahun ajaran dengan loading/empty/error | CI typecheck/build PASS; browser belum diuji |
| Security dependency audit | 0 advisories | [GitHub Actions](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38729950540) |
| Node unit test | **22/22 PASS** | [GitHub Actions](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38729950540) |

### Struktur tabel baru

`public.school_settings`, `public.academic_years`, `public.terms`, `public.programs`, `public.subjects`, `public.classes`, dan `private.master_idempotency`. Seluruhnya kosong. Tidak ada data siswa atau guru nyata yang ditambahkan. Total enam tabel akademik publik dan satu tabel privat.

### Batas akses

- Semua tabel baru memakai RLS tanpa policy baca/tulis untuk peran browser.
- API tahun ajaran menggunakan sesi Supabase terverifikasi dengan role admin, cookie aman, origin dan CSRF untuk POST.
- RPC mutasi hanya untuk `service_role`, memverifikasi aktor admin aktif di DB, memakai advisory lock, idempotency key dan satu transaksi untuk insert+audit.
- Tidak ada kata sandi, token, email alias, atau session handle yang disimpan pada pengujian.

### Pengujian yang masih diperlukan sebelum merge

1. Hosted browser/API untuk akun admin pada deployment PR preview, atau langkah validasi production main pasca-merge dengan rollback aman.
2. Session replay via HTTP menggunakan fixture sintetis khusus dan concurrent refresh end-to-end; tidak memakai sesi admin operator.
3. Verifikasi admin dapat membuat tahun ajaran pertama dan melihat daftar tanpa duplikasi.
4. Uji role negatif per kategori dan UI responsive ketika fitur guru/siswa ditambahkan.
5. Lint dan format formal (CI saat ini mengandalkan TypeScript, unit, dependency audit, bukan ESLint).

Catatan: SQL transaksi sintetis dijalankan dengan rollback; katalog dan sesi di luar transaksi tidak dimodifikasi.

## Cloudflare Pages preview verification

Cloudflare bot identified preview URL https://feat-m002-security-master-fo.portalgenius.pages.dev for PR #3.
GitHub Actions: https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38730497319 — **PASS 4/4**.

- HTML page: 200 PASS.
- API health: 200 PASS.
- GET `/api/v1/academic-years` without cookie: 401 PASS.
- Unknown API path: 404 PASS.

No authenticated admin mutation on preview was executed. Browser master-data write/refresh-concurrency remain NOT RUN. The Preview environment may require independent secret configuration; never copy values into source. This checkpoint is appropriate for an incremental integration but **does not close M-002**.
