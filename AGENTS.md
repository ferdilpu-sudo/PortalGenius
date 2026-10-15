# PortalGenius — Agent rules

Implementasikan hanya berdasarkan PRD, schema dan plan. Gunakan satu file satu tanggung jawab, tanpa file monster, tanpa emoji dalam UI.
Frontend tidak boleh memuat Supabase secret key, session tokens atau data pribadi pengguna lain.
Semua mutasi server wajib memeriksa origin dan CSRF bila autentikasi berbasis cookie.
Kunci API dan password dilarang ditulis pada log, repo, atau contoh konfigurasi.
Perubahan database wajib menghasilkan migrasi SQL yang di-review, RLS, pengujian negatif, dan bukti keamanan.
Jangan klaim deployment siap produksi sebelum hosted Auth, lint/build/CI, dan user journey PASS.
