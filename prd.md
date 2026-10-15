# PortalGenius — Kebutuhan Produk

Versi 1.0 · 14 Oktober 2026 · Pemilik keputusan produk: pengelola lembaga.
Status: spesifikasi siap untuk implementasi bertahap, bukan aplikasi yang sudah berfungsi. Keputusan pengguna bersifat tetap; default operasional yang belum dikonfirmasi ditandai Asumsi dan dapat diperbaiki sebelum milestone terkait.

## Tujuan dan pengguna
Satu portal internal untuk satu lembaga homeschooling SD, SMP, SMA, sekitar 10 guru dan 30 siswa. Mengurangi penyalinan data dari jurnal ke laporan perkembangan bulanan. Pengguna: admin, guru, petugas konselor yang ditunjuk, kepala sekolah. Siswa dan orang tua bukan pengguna login pada MVP. Pembelajaran kelas dan individual; materi bersama pada satu pertemuan, catatan serta nilai berbeda per siswa.

## Sumber kebutuhan
Wawancara pengguna pada 14 Oktober 2026, blanko Excel laporan, ZIP jurnalgenius-main, dan pedoman Uiux designer-v2. ZIP jurnal lama hanya referensi perilaku, bukan basis kode yang harus diimpor. Tidak memindahkan data lama. Lembar LVL tidak digunakan. Data pribadi dalam lampiran tidak boleh menjadi seed, fixture, screenshot demo, atau isi repository.

## Cakupan dan prioritas
Semua kebutuhan berikut Must untuk rilis internal pertama. Implementasi dipecah menurut [rencana](./plan.md), bukan dikerjakan serentak.

| ID | Perilaku | Aktor | Penerimaan |
|---|---|---|---|
| REQ-001 | Login username/password, ganti password, logout, reset melalui admin | Semua pengguna | AC-001 |
| REQ-002 | Akun individual, peran dan penugasan; akses data dibatasi | Admin dan pengguna | AC-002 |
| REQ-003 | Kelola siswa, wali, guru, mapel, jenjang, kelas, program, periode | Admin | AC-003 |
| REQ-004 | Kelompok belajar dan penugasan siswa/guru/mapel, termasuk individual | Admin | AC-004 |
| REQ-005 | Jurnal per pertemuan dengan materi bersama, peserta dan catatan individual | Guru | AC-005 |
| REQ-006 | Kehadiran per sesi dan metode belajar, Zoom serta Independence | Guru/admin | AC-006 |
| REQ-007 | Penilaian tugas, ulangan, UTS, UAS, bobot dan nilai akhir | Guru/admin | AC-007 |
| REQ-008 | Sikap bulanan serta catatan dan saran konselor | Petugas ditunjuk/admin | AC-008 |
| REQ-009 | Pilih siswa dan bulan, buat pratinjau laporan sesuai blanko | Admin | AC-009 |
| REQ-010 | Periksa, kembalikan, finalkan, dan revisi laporan | Admin | AC-010 |
| REQ-011 | Unduh PDF laporan siswa dan XLSX rekap yang diizinkan | Admin/kepala sekolah | AC-011 |
| REQ-012 | Beranda sesuai peran, filter periode, akses laporan final | Semua pengguna | AC-012 |
| REQ-013 | Form responsif, status penyimpanan benar, pemulihan kegagalan | Semua pengguna | AC-013 |
| REQ-014 | Audit perubahan penting, arsip, backup dan pemulihan | Admin/operator | AC-014 |

## Kriteria penerimaan
- AC-001: akun aktif login tanpa meminta email/telepon. Username dinormalisasi; kesalahan kredensial memberi pesan umum. Password sementara hanya membuka alur ganti password. Logout/reset menolak sesi aplikasi lama. Tidak ada signup publik.
- AC-002: guru A tidak dapat membaca/mengubah siswa atau jurnal di luar penugasannya melalui UI maupun request langsung. Kepala sekolah tidak dapat menulis nilai/finalisasi. Petugas konselor hanya mengakses siswa penugasannya. Admin terakhir tidak dapat dinonaktifkan atau kehilangan peran admin.
- AC-003: NIS unik, jenjang hanya SD/SMP/SMA; periode tidak ambigu, kelas sesuai jenjang. Arsip siswa tidak menghilangkan histori. Tidak ada data level per mapel. Data wali tidak ikut dikirim dalam daftar siswa guru.
- AC-004: kelompok memiliki anggota bertanggal efektif. Pertemuan individual tepat satu peserta; kelas satu atau lebih. Guru dan mapel harus memiliki penugasan aktif untuk peserta/tanggal yang dipilih.
- AC-005: materi wajib hanya sekali per pertemuan. Catatan individual tersimpan terpisah. Dua pertemuan berbeda dengan materi identik tetap tersimpan; pengiriman ulang request yang sama tidak menduplikasi. Konflik edit ditampilkan, bukan menimpa diam-diam.
- AC-006: rekap membedakan metode dan status. Contoh siswa memiliki tatap muka hadir 2 sesi, Zoom hadir 1, Independence hadir 1, Zoom izin 1: total 5; tampil Hadir tatap muka 2, Zoom 1, Independence 1, Izin 1. Lihat aturan lengkap di schema.
- AC-007: bobot harus 100%. Rerata tugas 80, UH 70, UTS 90, UAS 80 dengan bobot 20/20/30/30 menghasilkan 81,00. UAS kosong membuat nilai akhir belum tersedia; UAS nol adalah nilai sah. Nilai harian jurnal tidak otomatis dihitung sebagai UH.
- AC-008: enam indikator sikap bulanan dan catatan konselor dapat disimpan draft. Finalisasi memerlukan indikator lengkap serta catatan atau pernyataan eksplisit tidak ada catatan. Catatan internal tidak ikut PDF.
- AC-009: admin memilih tahun ajaran, bulan, satu siswa via nama/NIS. Nama, NIS, periode terlihat di pratinjau. Hanya jurnal terkirim pada tanggal periode dan siswa tersebut masuk. Data kosong ditampilkan sebagai kosong, bukan data siswa/periode sebelumnya.
- AC-010: finalisasi atomik menyimpan snapshot dan nomor versi; perubahan data setelah final tidak mengubah snapshot. Revisi membuat versi baru dengan alasan. Klik finalkan berulang tidak menerbitkan versi ganda.
- AC-011: PDF final A4 dapat diunduh, menampilkan semua baris, identitas, bagian A–D, tanda tangan dan nomor halaman. XLSX rekap cocok dengan filter; akses unduhan diperiksa ulang. Input mirip formula tetap berupa teks literal.
- AC-012: guru melihat tugasnya; admin melihat kelengkapan laporan; kepala sekolah dapat membuka laporan final. Setiap angka ringkasan berhubungan dengan daftar detail dan periode yang sama. Kehadiran tidak disebut persentase jika penyebut belum tersedia.
- AC-013: tugas utama berfungsi pada lebar 360, 768, 1280, 1440 CSS px. Tidak ada emoji. Gagal simpan mempertahankan isian di sesi halaman; aplikasi tidak menyatakan tersimpan sebelum konfirmasi server. Bisa dioperasikan dengan keyboard.
- AC-014: perubahan nilai/bobot, peran, reset akun, finalisasi dan revisi tercatat tanpa password/token. Backup terenkripsi diuji dipulihkan ke lingkungan terpisah; tidak ada reset database jurnal lama.

## Alur utama
1. Admin membuat periode dan master, akun, kelompok, penugasan. Jika duplikat atau tanggal bertentangan, data ditolak dengan letak kesalahan.
2. Guru login, pilih pertemuan, peserta, kehadiran, materi, catatan; simpan draft lalu kirim. Gagal jaringan mempertahankan form; retry memakai idempotency key yang sama.
3. Guru memasukkan penilaian per komponen. Admin mengatur bobot versi baru. Sistem memperlihatkan komponen belum lengkap sebelum menghitung hasil resmi.
4. Admin memilih siswa dan bulan, memeriksa data, meminta perbaikan, finalisasi, unduh PDF. Kepala sekolah membaca final. Perubahan setelah final melalui revisi.

## Nonfungsional dan batas rilis
Target (belum terukur): daftar utama p95 API <=2 detik pada beban uji 10 pengguna paralel; pratinjau <=5 detik untuk 100 baris; ekspor 100 baris <=10 detik pada laptop uji. Target aksesibilitas WCAG 2.2 AA untuk alur inti, tanpa klaim sertifikasi. Bahasa Indonesia, tanggal lokal Asia/Jakarta, NIS dan telepon teks. Optimalkan aset untuk HP menengah, tanpa animasi berat.
Online-first. Tidak menjanjikan penggunaan penuh offline atau background sync. Data belum tersimpan dalam memori bisa hilang saat tab ditutup; tampilkan peringatan. Catatan konselor tidak disimpan di localStorage. Target biaya awal nol bergantung kuota, kelayakan akun dan penggunaan, bukan jaminan.

## Di luar cakupan
Migrasi otomatis jurnal lama; level bidang studi; QUIP; rincian laporan psikologi terpisah; kasus/penanganan khusus terstruktur; sinkronisasi Google Sheets; integrasi Zoom (hanya label metode); pembayaran; chat; portal siswa/orang tua; AI; tanda tangan elektronik tersertifikasi; jadwal otomatis; multi-lembaga; batch PDF semua siswa. Master dapat diinput manual; impor Excel tahap berikutnya, bukan syarat rilis.

## Asumsi operasional
Laporan nilai terpisah dari laporan perkembangan bulanan. Rubrik sikap A/B/C/D, bobot per mapel-semester, pembulatan dua desimal, PDF dan XLSX, akun tanpa email pribadi, reset oleh admin, serta aturan kehadiran pada AC-006 adalah default usulan. Pemilik produk memvalidasi sebelum milestone terkait. Daftar keputusan terbuka ada di [decisions](./decisions.md). Tidak ada blocker untuk scaffolding.

## Ukuran keberhasilan pilot
Dengan data sintetis: guru menyelesaikan jurnal 3 siswa tanpa bantuan; admin menghasilkan satu laporan yang cocok data sumber; seluruh pengujian akses negatif lulus; tidak ada data ganda setelah retry. Waktu pengerjaan dicatat saat pilot untuk menentukan target berikutnya, bukan diklaim sudah tercapai.

Verifikasi: [testing](./testing.md). UX: [design](./design.md). Kontrak data: [schema](./schema.md).