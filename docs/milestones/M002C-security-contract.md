# M-002C — Identitas akademik dan penugasan (kontrak awal)

**Status:** IN PROGRESS — PR Draft, tidak untuk penggunaan data siswa sebenarnya.

## Urutan kerja
1. Schema guru, siswa, wali, enrollment, pengajaran, assignment siswa, dan konselor: RLS deny-by-default tanpa policy publik.
2. RPC proyeksi siswa berdasarkan role dan penugasan dengan pembatasan atribut. Service-only, actor berasal dari sesi yang benar-benar diverifikasi oleh Pages BFF.
3. SQL rollback uji negatif teacher A/B, konselor A/B, principal, revoked/expired assignment, admin, serta kebocoran atribut wali.
4. Baru setelah PASS, API admin provisioning/master dan tampilan; pembuatan akun memakai Supabase Auth admin di backend dengan rollback saat gagal.
5. Sesuai issue #2, uji replay cookie dan refresh paralel sungguhan sebelum mengaktifkan multiakun nyata.

## Aturan otorisasi
| Peran | Master siswa | Data wali | Penugasan |
| --- | --- | --- | --- |
| Admin | Kelola | Kelola | Kelola, audit |
| Guru | Hanya siswa pada penugasan yang masih berlaku (proyeksi minim) | Tidak | Penugasan sendiri read-only |
| Konselor | Hanya siswa dampingan aktif (proyeksi minim) | Tidak | Dampingan sendiri |
| Kepala sekolah | Tidak ada akses daftar mentah (ringkasan disiapkan terpisah) | Tidak | Tidak |
| Anon, authenticated direct | Tidak | Tidak | Tidak |

- Arsip mempertahankan histori; tidak ada cascade delete pada data akademik.
- Sesi admin/operator saat ini tidak disentuh oleh test fixture dan database harus tetap tanpa siswa nyata maupun dummy setelah SQL rollback.
- `pg_m002c_visible_students` bukan endpoint publik; hanya dapat dipanggil service_role dari Pages BFF yang telah memverifikasi cookie serta sesi.
