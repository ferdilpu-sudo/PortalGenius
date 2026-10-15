# PortalGenius — UX dan Sistem Desain

Versi 1.0, rancangan berdasarkan wawancara serta pedoman Uiux designer-v2. Belum ada uji pengguna atau mockup visual tervalidasi. Nama arah: Modern Minimalist Academic. Profesional tanpa emoji pada UI, dokumentasi, placeholder, toast, dan fixture demo.

## Prinsip pengalaman
Guru menyelesaikan pencatatan tanpa mengetik identitas berulang. Admin menemukan kekurangan sebelum menerbitkan laporan. Kepala sekolah membaca hasil dengan konteks periode. Satu tindakan utama per layar; istilah familiar; opsi lanjutan dibuka saat diperlukan. Terapkan proximity untuk mengelompokkan input, pola navigasi konvensional, status simpan yang terlihat, dan kendali kembali/perbaiki. Tidak membuat klaim perilaku pengguna berdasarkan asumsi demografi.

## Struktur informasi
| Area | Isi | Peran |
|---|---|---|
| Beranda | Tugas, draft, kelengkapan atau laporan final sesuai role | Semua |
| Akademik | Siswa, guru, mapel, kelas/program, periode, kelompok, penugasan | Admin |
| Jurnal | Daftar saya, buat, draft, detail, kehadiran | Guru/admin |
| Nilai | Assessment, grid skor, kebijakan bobot | Guru/admin |
| Perkembangan | Sikap bulanan, catatan publik, catatan internal terpisah | Petugas konselor/admin terbatas |
| Laporan | Pemilih siswa, preview, review, arsip versi final | Admin/kepala sekolah |
| Pengaturan | Profil lembaga, akun, peran, preferensi | Admin; profil sendiri semua |

Laptop: sidebar 240 px, header ringkas, judul+bantuan+aksi, filter, area kerja. Mobile: Beranda/Jurnal/Nilai/Lainnya untuk guru; menu disesuaikan tugas role lain. Maksimum empat tujuan utama bottom navigation; jangan padatkan seluruh menu admin di bawah. Multi-role melihat gabungan tugas berizin dengan label, tanpa perlu logout. Pengaturan akun terpisah dari navigasi pekerjaan.

## Katalog layar
| ID | Layar dan tindakan utama | Elemen/kondisi | Kebutuhan |
|---|---|---|---|
| UI-001 | Login / Masuk | Username, password, tampilkan password, bantuan hubungi admin; generic error | REQ-001 |
| UI-002 | Ganti password / Simpan password | Password saat ini/baru, validasi; wajib ganti sebelum data sekolah | REQ-001 |
| UI-003 | Beranda / Tugas utama per role | Periode aktif, draft, kelengkapan, angka bisa dibuka detail | REQ-012 |
| UI-004 | Master akademik / Tambah | Search/filter/list/form/arsip, duplicate error | REQ-003 |
| UI-005 | Penugasan / Simpan penugasan | Guru, mapel, peserta, masa berlaku, individual/kelas | REQ-004 |
| UI-006 | Jurnal / Lanjut atau Kirim jurnal | Empat langkah; draft jelas; invalid field tetap terlihat | REQ-005, REQ-006 |
| UI-007 | Nilai / Simpan perubahan | Desktop grid, mobile per siswa, bobot read-only bagi guru | REQ-007 |
| UI-008 | Perkembangan / Kirim untuk diperiksa | Enam indikator, deskripsi/saran, catatan internal pada area berbeda | REQ-008 |
| UI-009 | Pilih laporan / Buat pratinjau | Tahun ajaran, bulan, siswa wajib, jenis laporan; optional filter kelas/jenjang | REQ-009 |
| UI-010 | Periksa laporan / Finalkan | Kelengkapan, preview, kembalikan/alasan, source-changed state | REQ-010 |
| UI-011 | Laporan final / Unduh PDF | Identitas, versi, waktu final, revisi oleh admin | REQ-011 |
| UI-012 | Akun / Buat akun | Username, role, status, password sementara sekali tampil | REQ-002 |
| UI-013 | Profil siswa / Tab sesuai akses | Ringkasan, jurnal, kehadiran, nilai, perkembangan, laporan | REQ-003, REQ-012 |

## Alur jurnal
1. Pertemuan: tanggal default hari ini Asia/Jakarta, sesi, jumlah unit, mapel dari penugasan, metode, jenis kelas/individual.
2. Peserta dan kehadiran: pilihan hanya siswa yang ditugaskan. Aksi tandai semua hadir harus eksplisit dan dapat dibatalkan, bukan asumsi hadir diam-diam.
3. Pembelajaran: materi bersama sekali; kartu per siswa untuk catatan/nilai. Mobile satu siswa dengan progres 2 dari 3 dan tombol sebelumnya/berikutnya; desktop daftar siswa di samping. Isian tersimpan pada state ketika pindah langkah.
4. Review: identitas pertemuan, jumlah peserta, status kehadiran, kekurangan. Kirim hanya bila lengkap. Simpan draft diperbolehkan lebih awal.

Simpan draft memakai server, respons berhasil baru menampilkan waktu simpan. Pada koneksi gagal, pertahankan memori form, tampilkan Coba lagi dan peringatan tutup halaman; jangan janji draft permanen di perangkat. Navigasi dengan perubahan belum disimpan meminta pilihan tetap di halaman atau tinggalkan. Konflik edit 409 menampilkan data telah berubah dan opsi muat versi terbaru; jangan melakukan auto-merge catatan.

## Alur nilai
Desktop tabel memiliki header siswa dan kategori, input numerik terlabel, navigasi Tab, nilai null ditampilkan Belum diisi. Mobile gunakan nama siswa dan form per komponen. Tampilkan bobot aktif serta status sementara. Admin melihat preview dampak perubahan kebijakan sebelum aktivasi. Jangan gunakan slider nilai. Bulk paste dan spreadsheet import di luar MVP agar validasi tidak tersamarkan.

## Alur laporan per siswa
Pemilih nama/NIS searchable menampilkan nama, NIS, kelas untuk membedakan nama sama. Ganti siswa/periode membatalkan request lama dan membersihkan preview lama; gunakan request identity agar respons terlambat tidak tertukar.
Desktop: panel kelengkapan 320 px kiri, kertas preview kanan. Mobile: tab Kelengkapan/Pratinjau; informasi identitas tetap terlihat. Preview belum final diberi DRAFT. Jangan menampilkan kegagalan sebagai laporan kosong. Kelengkapan link ke sumber yang memang diizinkan.
Admin dapat meminta perbaikan dengan catatan, lalu review lagi. Finalkan menampilkan konfirmasi nama, NIS, bulan dan konsekuensi versi. Source revision berubah -> pesan Perubahan data terdeteksi. Muat ulang pratinjau sebelum finalisasi.

## Format laporan
PDF A4 portrait, margin awal 15 mm sebagai usulan; font laporan 10–11 pt, judul 14–16 pt. Identitas, A kegiatan, B kehadiran, C sikap, D konselor, pengesahan mengikuti blanko. Tabel kegiatan kolom tanggal/sesi/mapel/guru/materi/keterangan. Header tabel berulang; teks wrap; baris panjang berlanjut dengan aturan renderer teruji. Jangan mengecilkan semua teks agar satu halaman. Section tanda tangan tidak terpotong. Gunakan halaman x dari y dan versi laporan. Tidak menaruh sidebar, tombol, data sesi autentikasi, atau catatan internal dalam PDF. Nama penanda tangan dari konfigurasi/snapshot; tanda tangan basah berupa ruang kosong, bukan gambar tanda tangan yang dikarang.

## Tokens awal
Palet adalah usulan konsisten dari diskusi, bukan bukti kontras telah diukur. Ukur pasangan aktual sebelum UI selesai.

| Token | Nilai |
|---|---|
| color.brand | #183153 |
| color.action | #0F766E |
| color.background | #F6F8FB |
| color.surface | #FFFFFF |
| color.text | #172033 |
| color.textSecondary | #475569 |
| color.border | #CBD5E1 |
| color.danger | #B91C1C |
| color.warning | #92400E |
| color.success | #166534 |
| color.focus | #1D4ED8 |
| font.family | Inter self-hosted, system-ui, sans-serif |
| font.size | 12 caption; 14 table; 16 body/input; 20 section; 28 page |
| font.weight | 400, 500, 600 |
| spacing | 4, 8, 12, 16, 24, 32, 48 px |
| radius | 8 px control; 12 px card/dialog |
| motion | 120–180 ms, respects reduced-motion |

Permukaan solid, shadow tipis hanya untuk elevasi yang diperlukan. Tanpa glassmorphism pada form/tabel, tanpa neumorphism, gradient dekoratif besar, animasi konfeti atau emoji. Tema terang saja pada MVP. Ikon Lucide satu keluarga, dekoratif aria-hidden, icon-only action punya accessible name dan tooltip bila perlu. Loading skeleton sederhana tanpa menggeser layout.

## Komponen dan keadaan
Button, TextField, Select/Combobox, DateField, Dialog, Tabs, DataTable, StatusBadge, ErrorSummary, EmptyState, Toast, FormSection, ReportPreview. Tiap kontrol default/hover/pressed/focus/disabled/loading; halaman loading/empty/error/success/forbidden/stale. Disabled disertai alasan yang dapat dibaca. Toast keberhasilan tidak menjadi satu-satunya bukti penyimpanan; status persisten dekat form.

| Kondisi | Microcopy |
|---|---|
| Login gagal | Username atau password tidak sesuai. |
| Belum ada jurnal | Belum ada jurnal pada periode ini. |
| Gagal simpan | Jurnal belum tersimpan di server. Periksa koneksi lalu coba lagi. |
| Nilai belum lengkap | Nilai akhir belum tersedia. Lengkapi nilai UAS. |
| Simpan sukses | Jurnal berhasil disimpan. |
| Forbidden | Anda tidak memiliki akses ke data ini. |

## Responsif dan aksesibilitas
Desain dari 360 px; tablet 768 px; desktop mulai 1024 px. Breakpoint disesuaikan konten, bukan identitas perangkat. Form satu kolom di HP; tabel lebar boleh scroll dalam container berlabel, bukan seluruh halaman. Target sentuh utama >=44x44 CSS px sebagai standar proyek; tidak disamakan dengan ukuran wajib semua kontrol WCAG.
Target WCAG 2.2 AA: teks normal kontras >=4.5:1, teks besar >=3:1; komponen dan indikator sesuai kriteria relevan; fokus terlihat dan tidak tertutup sticky footer. Label terhubung input, error aria-describedby, ringkasan error fokus, dialog focus trap dan kembali ke pemicu. Heading logis, landmark, skip link, keyboard penuh. Password manager dan paste diizinkan. Reduced motion, zoom 200%, screen reader dan teks panjang diuji. Login tidak bergantung CAPTCHA kognitif tanpa alternatif.

## Validasi sebelum final UI
Wireframe enam layar inti dahulu (login, beranda guru, jurnal, profil siswa, nilai, laporan). Uji dengan pengelola dan perwakilan guru menggunakan data sintetis: login, jurnal 3 siswa, nilai kosong vs nol, laporan siswa A ke B. Catat waktu, bantuan, salah pilih dan pemulihan. Tidak perlu A/B testing skala besar untuk 10 pengguna. Logo, rubrik, redaksi pengesahan masih terbuka; tidak menghambat kerangka UI. Native app, panduan Apple/Android spesifik dan dark mode tidak berlaku untuk MVP web ini.

[PRD](./prd.md) · [Testing](./testing.md) · [Rules](./rules.md)