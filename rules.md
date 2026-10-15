# PortalGenius — Aturan Pengembangan

## Aturan wajib
Satu file satu tanggung jawab utama. Jangan membuat halaman yang sekaligus mengakses DB, menghitung nilai dan membuat PDF. App.tsx hanya komposisi. Hindari utils.ts/service.ts umum penampung semua logika. Setiap file dapat dijelaskan dengan satu kalimat tanggung jawab.
Review pada 250–300 baris sumber nonblank atau lebih dari satu alasan perubahan. Bukan hard limit untuk schema/generated data yang kohesif. Catat pengecualian pada PR dan decisions; jangan memecah menjadi banyak wrapper satu baris untuk mengakali ukuran. Tidak ada circular import.

## Struktur dan kepemilikan
Ikuti [architecture](./architecture.md). Feature memiliki UI/hook/API adapter sendiri; domain business rules murni; repository dan SDK server di server/. UI tidak mengimpor modul server. Satu route satu use case; registrasi route tidak memuat seluruh handler. Shared module hanya jika ada dua pemakai nyata dengan kontrak yang sama. Nama React PascalCase, fungsi camelCase, SQL snake_case. Pecah file PDF per section dan satu assembler; pecah schema validator per resource.

## TypeScript dan kontrak
strict=true, lint tanpa unused, hindari any dan non-null assertion tanpa pembuktian. API response tervalidasi, DTO bukan database row mentah. Date-only tidak dikonversi sembarang UTC. Gunakan decimal DB untuk nilai; jangan bergantung floating point browser untuk nilai resmi. ID stable UUID; nama siswa/guru bukan kunci. Tidak memakai data pribadi asli di tests atau demo.

## Keamanan
Autentikasi tidak sama dengan otorisasi. Setiap route dan RLS memeriksa actor/action/resource. Frontend menyembunyikan tombol hanya untuk UX. Secret client berbeda tipe/lokasi dari user JWT client dan hanya tersedia di helper privileged. Dilarang prefix VITE_ untuk service secret, alias mapping atau encryption key. Private tables tidak diekspos. Security definer harus minimal, search_path eksplisit, grants ditinjau, policy recursion diuji.
Password, session handle, refresh/access token, catatan konselor dan data wali tidak masuk log. Mutasi memeriksa CSRF/Origin. Tidak menyimpan token di localStorage atau cache shared CDN. Tidak memakai HTML raw untuk materi/catatan. Batasi body size dan panjang input. XLSX cell text tidak menjadi formula. Login/reset membatasi percobaan secara atomik dan tidak mengungkap apakah username terdaftar.

## Konsistensi dan transaksi
Jurnal+peserta, score+audit, final report+snapshot+audit atomik. expectedVersion pada edit. Idempotency key per operasi logis, retry memakai key sama; beda payload key sama konflik. Retry hanya timeout/operasi retry-safe; kegagalan validasi tidak diulang otomatis. Satu action pending disable tombol tetapi tidak mengandalkan ini untuk dedup. Snapshot final tidak diupdate/dihapus oleh role aplikasi biasa.

## UI profesional
Tanpa emoji dalam UI/copy/demo/dokumen. Ikon SVG keluarga konsisten, label accessible. Token warna/spacing terpusat; jangan inline palette berbeda setiap halaman. Semua keadaan UI pada design wajib, terutama no-data vs error vs access denied. Jangan menampilkan berhasil sebelum server mengonfirmasi. Status draft tidak disamakan dengan submitted atau final. Pengguna tidak diberi jargon service_role, RPC, RLS dalam pesan produk.

## Dependensi dan perubahan
Pin versi pasti, commit lockfile, npm ci di CI. Jangan install dependency untuk fungsi sederhana tanpa alasan. Verifikasi lisensi/maintenance dan kompatibilitas Edge untuk server. Update berscope kecil; tidak rewrite global setiap fitur. Migrasi berurutan via CLI yang diverifikasi; tidak mengubah migration yang sudah dipakai hosted. Tidak menerapkan schema paket lama. Destructive production action perlu keputusan eksplisit dan backup teruji.

## Gate review
Lihat [testing](./testing.md): format/lint/typecheck/build dan tes perilaku terkait. Untuk auth/data, uji request langsung tanpa UI; untuk ekspor, verifikasi file hasil. Uji tambahan hanya untuk risiko nyata/gate, bukan mengejar jumlah tes. Jangan klaim seluruh aplikasi aman karena smoke lulus. Sebelum merge periksa tanggung jawab file, direction imports, no secrets, coverage REQ/AC, doc update dan error states. Status NOT RUN jika belum dieksekusi.

## Pengecualian
Tuliskan alasan, file/modul, dampak, pengujian pengganti dan kapan ditinjau ulang di [decisions](./decisions.md). Pengecualian tidak boleh mengubah keputusan produk secara diam-diam. Pedoman lokal menyesuaikan instruksi pengguna terbaru dan kewenangan yang memang diberikan.