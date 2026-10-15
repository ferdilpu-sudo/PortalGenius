# PortalGenius M-001 — status implementasi

- **GitHub**: repository diinisialisasi, branch pengembangan `feat/m001-foundation-auth`.
- **Supabase**: 6 tabel RLS, 10 fungsi autentikasi hanya dapat dieksekusi oleh `service_role`.
- **Akun aplikasi**: belum dibuat; data siswa masih kosong.
- **Build/CI/browser**: belum diverifikasi; environment npm di ChatGPT ini tidak dapat mengakses npm registry.
- **Cloudflare**: deployment dan secret belum dipasang.
- **Kebijakan**: 1 file 1 tanggung jawab; tanpa migrasi data legacy.
- **Gate**: M-001 tetap IN PROGRESS sampai smoke test login username/password dan RLS negatif PASS.
