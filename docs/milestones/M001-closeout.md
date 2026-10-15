# M-001 Closeout — PortalGenius

Tanggal: 15 Oktober 2026  
Status: **CLOSED — accepted by operator with documented exceptions**  
PR fondasi: https://github.com/ferdilpu-sudo/PortalGenius/pull/1  
Target hosted: https://portalgenius.pages.dev  
Supabase project ref: `vpglikrkvsnoyjvluigs`

## Hasil utama

| Deliverable / gate | Bukti dan status |
| --- | --- |
| React + TypeScript/Vite, Cloudflare Pages Functions BFF | CI typecheck + build **PASS** |
| Versi npm pinned + reproducible lockfile | `npm ci` **PASS** |
| Kualitas dasar | **12/12 unit PASS**, npm audit **0** pada CI terbaru |
| Migrasi skema identitas/sesi | Tiga migrasi applied; enam tabel RLS, service-only auth RPC |
| Cloudflare Pages hosted | Health=200; session anon=401; foreign Origin=403; username tak dikenal=401 (**4/4 PASS**) |
| Bootstrap admin pertama | Operator `ADMIN_BOOTSTRAP_SUCCESS`; database satu admin aktif |
| Penggantian password awal | Operator **PASS**; DB `must_change_password=false` |
| Logout dan login ulang dengan password baru | Operator **PASS**; database dua sesi revoked, satu sesi eligible |
| Replay sesi dicabut di level RPC | Read-only SQL: dua sesi revoked, **0 readable** lewat `pg_auth_session_get` |
| RLS deny-by-default | Anonymous direct table privilege ditolak; authenticated tanpa JWT melihat 0 akun/role |
| Autentikasi aman di browser | Server-only Supabase Auth, cookie `__Host-` HttpOnly/Secure; CSRF dan Origin guard; sebagian diuji unit/hosted |

## Bukti yang dirujuk

- GitHub Quality CI terakhir sebelum closeout: https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38716589330
- Hosted smoke 4/4: https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38697975557 (attempt 3)
- Dependensi Wrangler diremediasi (audit zero): https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38706715872
- Operator menyatakan pada 15 Oktober: **bootstrap, login pertama, wajib ganti password, logout dan relogin berhasil**. Tidak ada kredensial disimpan pada laporan.

## Risiko dan pengujian tertunda (bukan PASS)

1. **Leaked Password Protection**: advisor Supabase `auth_leaked_password_protection` berstatus WARN. Operator menyatakan fitur ini memerlukan upgrade Pro. Pengecualian paket diterima untuk penutupan M-001. Pertahankan kontrol password minimum, limit percobaan, dan pengelolaan kredensial oleh Supabase; evaluasi mitigasi/upgrade saat ekspansi pengguna.
2. **Replay cookie via HTTP**: cek RPC bahwa sesi revoked tidak dapat dibaca PASS, tetapi uji HTTP berbasis cookie asli/sintetis belum dilakukan. Status **NOT RUN**.
3. **Concurrent refresh/race dan retry lease**: implementasi ada, tes concurrency runtime hosted belum dieksekusi. Status **NOT RUN**.
4. **Formal ESLint/Prettier**: typecheck dan unit test PASS, tetapi perintah lint/format formal belum menjadi quality gate. Status **NOT RUN**.
5. **RLS cross-role dan public sign-up disable**: role akademik baru M-002 belum diprovision; verifikasi khusus akun sintetis dan pengaturan Supabase wajib sebelum memperluas pengguna.
6. Temuan RLS-without-policy pada tabel private dan audit adalah **deny-by-default yang disengaja** dan tetap terlihat sebagai INFO.

Tindak lanjut seluruhnya dicatat pada [M-002 initial hardening issue #2](https://github.com/ferdilpu-sudo/PortalGenius/issues/2) dengan prioritas sebelum provisioning guru/konselor. Jangan membuat data pribadi siswa nyata sebelum akses per-role dan aturan bisnis diuji.

## Keputusan akhir

Operator menyetujui penutupan M-001 walaupun proteksi password bocor berada di tier Pro. Penutupan ini berarti fondasi diterima sebagai dasar kerja M-002, **bukan** sertifikasi seluruh kontrol keamanan atau kesiapan sistem produksi. [ADR-009](../../decisions.md) merekam risk acceptance secara eksplisit.
