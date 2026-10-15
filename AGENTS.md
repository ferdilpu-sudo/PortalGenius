# PortalGenius — Instruksi AI Coding Agent

## Tujuan dan batas
Bangun MVP sesuai [prd.md](./prd.md), dari awal, data kosong, satu lembaga SD/SMP/SMA. Cloudflare Pages/pages.dev dan Supabase proyek baru adalah keputusan pengguna. Jangan mengubah menjadi proyek bersama lama, mengimpor data siswa, atau menambah fitur AI/chat/pembayaran tanpa permintaan. Paket ini spesifikasi, belum kode. Tidak ada emoji; semua copy profesional.

## Urutan baca
1. [README.md](./README.md): status dan setup.
2. [prd.md](./prd.md): scope dan REQ/AC.
3. [plan.md](./plan.md): mulai milestone pertama belum Verified.
4. [architecture.md](./architecture.md), [schema.md](./schema.md), [design.md](./design.md): kontrak implementasi.
5. [rules.md](./rules.md), [testing.md](./testing.md), [decisions.md](./decisions.md): aturan, bukti, asumsi.

PRD memiliki scope; schema memiliki field/perhitungan; design memiliki interaksi; architecture memiliki batas modul; decisions memiliki alasan; rules memiliki standar; testing memiliki verifikasi; plan memiliki urutan. Instruksi eksplisit pengguna terbaru mengungguli asumsi. Jangan mengubah keputusan yang dikonfirmasi secara diam-diam. Laporkan konflik material dengan alternatif konkret.

## Cara bekerja
Periksa repository dan AGENTS yang sudah ada sebelum menulis. Kerjakan satu TASK/increment kecil; pilih modul yang disentuh, implementasikan perilaku dan tes relevan, perbarui docs yang terdampak. Satu file satu tanggung jawab utama; no monster files, no giant utils/service, no business logic di halaman. Review file mendekati 250–300 baris; jangan fragmentasi tanpa fungsi mandiri.

Gunakan data sintetis. Tidak menghubungkan test reset ke produksi. Username-only wajib: buktikan adapter dan sesi pada M-001, jangan berpura-pura Supabase memiliki username native. Browser tidak menerima service secret/token Supabase. Otorisasi user/resource di backend dan RLS wajib. Tidak menunda akses negatif sampai akhir proyek.

Periksa dokumentasi resmi untuk versi/API sebelum pin. Command pada README bersifat rencana sampai scaffold membuktikan. Tidak menjalankan deploy publik/produksi atau destructive data change hanya karena dokumen menyebut langkah tersebut; ikuti otorisasi sesi pengguna. Lanjutkan tugas lokal/reversibel yang sudah diotorisasi tanpa meminta persetujuan ulang. Jika akses eksternal terblokir, kerjakan bagian independen dan nyatakan gate NOT RUN.

## Definition of done
REQ/AC/TEST terkait jelas; build/type/lint dan tes yang relevan dieksekusi; error/empty/loading/forbidden tertangani; dependency direction benar; tidak ada secrets/PII fixture; file tetap kohesif. Reports memakai snapshot dan revisi, null grade bukan nol, metode bukan status hadir. Tidak boleh menampilkan sukses bila penyimpanan gagal. Perbarui plan dengan bukti, bukan dugaan.

## Format laporan kerja
Ringkasan perubahan, file utama, TASK/REQ/TEST, command dan PASS/FAIL/NOT RUN, risiko yang masih ada, langkah terkecil selanjutnya. Jangan mengklaim aplikasi production-ready dari build saja. Jika asumsi OPEN belum tervalidasi, sebut dampaknya sebelum mengunci modul terkait.