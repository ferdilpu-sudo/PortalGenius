# PortalGenius — M-002B implementation checkpoint

Tanggal: 15 Oktober 2026  
PR: https://github.com/ferdilpu-sudo/PortalGenius/pull/4  
Lingkup: semester, program, mata pelajaran, kelas; M-002 keseluruhan tetap IN PROGRESS.

## Verifikasi

| Gate | Hasil |
| --- | --- |
| React UI dan Pages API empat master | Implemented; unit + TypeScript + build PASS |
| SQL fungsi create semester | Applied: 20261015121106 |
| SQL fungsi create catalog program/subject | Applied: 20261015121111 |
| SQL fungsi create kelas | Applied: 20261015121114 |
| Test SQL rollback (idempotency, overlapping term, year bounds, grade, dupe case, admin, audit) | PASS; data persistent = 0 |
| Supabase RPC grants | anon/authenticated denied; service_role permitted |
| Cloudflare preview homepage/health GET | PASS 2/2 |
| Cloudflare Preview GET anonymous all four endpoints | PASS 4/4 HTTP 401 |
| Cloudflare Preview POST hostile Origin all four | PASS 4/4 HTTP 403 |
| Cloudflare Preview POST no cookie all four | PASS 4/4 HTTP 401 |
| Cloudflare Preview total | **14/14 PASS** |
| Database student/teacher data | Not created |

Bukti preview: https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38735545248 (attempt 2).  
Quality CI: https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38735869364 (PASS pada patch akses awal).

## Catatan penting

Percobaan preview pertama **6/14** karena POST mengembalikan HTTP 503 ketika secret environment Preview belum siap. Patch `server/master/masterRoute.ts` menolak origin asing dan sesi kosong **sebelum** membaca rahasia runtime; ini mencegah respons 503 pada permintaan yang memang tidak berhak masuk. Untuk request dengan cookie sungguhan, pemeriksaan konfigurasi, CSRF, sesi, dan role tetap dijalankan. **Jangan menafsirkan 14/14 ini sebagai kesiapan authenticated Preview backend.**

## Pekerjaan berikutnya

- Deploy perubahan yang sudah lolos ke `main` (increment terbatas, bukan penutupan M-002).
- Operator mengonfirmasi empat menu tersedia pada Production setelah deployment `main`.
- Gunakan data lembaga yang benar untuk tes create pertama; tanpa konten dummy pada database hosted.
- Integrasi login admin dan peran non-admin, rollback edge cases runtime, lint formal, session replay/refresh concurrency tetap gate sebelum provisioning guru/siswa nyata. Rujuk [issue #2](https://github.com/ferdilpu-sudo/PortalGenius/issues/2).
- Peringatan Supabase Leaked Password Protection tetap accepted exception sesuai M-001; bukan PASS.
