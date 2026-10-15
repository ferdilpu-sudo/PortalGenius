# PortalGenius — Keputusan dan Asumsi

Semua entri dicatat 14 Oktober 2026. Dikonfirmasi berarti keputusan eksplisit pengguna. Rancangan berarti rekomendasi teknis paket ini, bukan pilihan yang diklaim telah dipilih pengguna. Validasi berarti perlu dibuktikan sebelum milestone terkait.

| ADR | Status | Keputusan | REQ | Tinjau ulang bila |
|---|---|---|---|---|
| ADR-001 | Dikonfirmasi | Build baru, data kosong, satu lembaga SD/SMP/SMA | REQ-003 | Perlu migrasi/multi-lembaga |
| ADR-002 | Platform dikonfirmasi; stack rinci rancangan | Pages + Functions, React/TS/Vite, Supabase proyek baru | REQ-001, REQ-013 | Batas runtime/biaya gagal memenuhi target |
| ADR-003 | Prinsip dikonfirmasi; tokens rancangan | Modern Minimalist, profesional tanpa emoji, satu file satu tanggung jawab | REQ-013 | Uji pengguna menunjukkan hambatan |
| ADR-004 | Username dikonfirmasi; adapter validasi | Username BFF ke Supabase Auth, akun oleh admin | REQ-001, REQ-002 | Alias/session flow gagal spike |
| ADR-005 | Rancangan | Metode terpisah dari status, rekap enam kategori eksklusif | REQ-006 | Makna laporan lembaga berbeda |
| ADR-006 | Bobot admin dikonfirmasi; detail asumsi | Policy per mapel/semester, null bukan nol | REQ-007 | Remedial/rubrik khusus diperlukan |
| ADR-007 | Per siswa dikonfirmasi; output rinci asumsi | Snapshot final, PDF bulanan, XLSX rekap | REQ-009, REQ-010, REQ-011 | Format lembaga atau performa ekspor berubah |
| ADR-008 | Rancangan | Online-first, server drafts, tanpa offline sync | REQ-013 | Koneksi pilot tidak memadai |

## ADR-001 — Proyek baru
Pilihan: refactor jurnal lama atau mulai baru. Pengguna memilih baru dan tanpa migrasi. Referensi lama membantu alur guru; implementasi dan seed tidak disalin otomatis. Konsekuensi: input master awal diperlukan, aplikasi lama tetap utuh. Pemilik: pengguna. Mulai dari nol bukan izin menghapus proyek lama.

## ADR-002 — Platform dan modularitas
Pengguna memilih Cloudflare Pages/pages.dev dan Supabase; akun lembaga baru untuk proyek terpisah. Dibanding berbagi proyek lama, isolasi ini memisahkan data dan konfigurasi. Akun, jatah free dan hostname belum dibuktikan. React/Vite SPA dipilih perancang karena portal internal tanpa kebutuhan SEO/SSR dan referensi sebelumnya React. Alternatif Next.js menambah kebutuhan runtime server; Vue layak tetapi tidak ada manfaat khusus dari pindah framework. BFF Pages Functions menjaga alur username dan session cookies. Satu repository modular, bukan microservices. Biaya target nol, bukan janji free selamanya.

## ADR-003 — UX dan disiplin kode
Pedoman Uiux designer-v2 dan larangan emoji menjadi acuan. Professional minimalism dibanding brutalism/glass-heavy lebih sesuai tabel dan formulir. Warna/spacing pada design adalah baseline usulan, perlu QA kontras. One-file-one-responsibility wajib, review ukuran 250–300 baris; pengecualian kohesif dijelaskan. Komponen kecil tanpa alasan mandiri juga dihindari. Pemilik prinsip: pengguna; implementasi: coding agent.

## ADR-004 — Username-only
Supabase mendokumentasikan password dengan email/phone. Alternatif: meminta email pengguna (bertentangan UI yang diminta), membangun password storage sendiri (risiko/pekerjaan lebih besar), atau adapter username ke alias internal. Dipilih adapter BFF dengan Supabase tetap menyimpan password. UUID alias internal tidak mengikuti username agar rename tidak mengubah identitas. Validasi M-001 harus membuktikan create/login/reset/refresh/logout serta replay sesi ditolak. Ini mekanisme teknis, bukan fitur username native Supabase. Jangan memasukkan secret ke browser. Bila alias internal ditolak oleh provider, catat blocker dan alternatif; jangan diam-diam memakai identitas pribadi atau mengubah requirement. Password sementara/reset oleh admin adalah asumsi operasional tanpa email pemulihan. Alias bukan alamat pengiriman email.

## ADR-005 — Metode dan sesi
Zoom menggantikan Skype, Independence dipertahankan (dikonfirmasi). Pemisahan mode/status dan aturan enam kategori adalah rancangan untuk mencegah double-count. Alternatif enum gabungan menyulitkan Zoom+Izin. Session_units mendukung label 1–2 pada blanko. Perubahan status dalam dua sesi harus dipisah. Materi bersama dikonfirmasi; level per mapel dikeluarkan. Validasi makna Independence dan session_units oleh pemilik produk sebelum M-003.

## ADR-006 — Nilai
Bobot diatur admin (dikonfirmasi). Default: tugas/UH/UTS/UAS, bobot per mapel-semester, kategori dengan bobot >0 wajib memiliki nilai, no silent reweight, dua desimal. Alternatif menganggap null nol mengaburkan data yang belum diisi. Remedial sebagai koreksi beralasan, bukan formula sekolah yang dikarang. Bobot contoh hanya fixture, bukan default resmi. Nilai harian jurnal tetap terpisah agar tidak menggandakan UH. Pemilik memvalidasi sebelum M-004.

## ADR-007 — Laporan
Admin memilih siswa dan periode (dikonfirmasi). PDF mengikuti struktur blanko, tidak pixel-perfect berdasarkan screenshot yang belum terbaca. Alternatif laporan live dapat berubah setelah final; dipilih snapshot immutable dan revisi. PDF dan XLSX adalah output usulan dari rekap yang disetujui untuk dieksekusi, format final diverifikasi pada M-006. Ekspor browser mengurangi biaya server; konsekuensi ukuran bundle dan memori diuji. Cetak browser dapat menjadi jalur tambahan, bukan pengganti unduh PDF tanpa keputusan. Tanda tangan basah disediakan ruang; tidak mengklaim tanda tangan digital tersertifikasi.

## ADR-008 — Koneksi
Server draft dipilih daripada cache sensitif browser/offline sync yang kompleks. Saat jaringan putus form tetap dalam memori tetapi belum aman dari penutupan tab; teks status harus jujur. Alternatif IndexedDB queue memerlukan pemisahan akun, enkripsi dan resolusi konflik; ditunda. Tetap gunakan idempotency untuk retry.

## Daftar terbuka dan default yang dipakai
| ID | Pertanyaan/pemilik | Default sementara | Dampak dan titik validasi |
|---|---|---|---|
| OPEN-001 | Operator: akun/proyek/free tier dan hostname tersedia? | Proyek baru terpisah; tidak mengubah lama | Hosted M-001/M-007; lokal tetap dapat dikerjakan |
| OPEN-002 | Pengelola: arti Independence dan jumlah sesi? | Sesuai schema AC-006 | Jurnal dan laporan M-003 |
| OPEN-003 | Pengelola akademik: bobot, pembulatan, remedial? | Konfigurasi tanpa bobot produksi bawaan; dua desimal | Nilai M-004 |
| OPEN-004 | Konselor: rubrik A–D dan siapa mengisi sikap bulanan? | Petugas konselor ditugaskan; admin memeriksa | Perkembangan M-005 |
| OPEN-005 | Pengelola: logo, penanda tangan, program, kalender dan redaksi? | Konfigurasi kosong, data demo sintetis | Finalisasi produksi M-006/M-007 |
| OPEN-006 | Pengelola/operator: retensi, backup dan pemulihan? | Arsip, tanpa auto-delete akademik; backup harian terenkripsi | Rilis M-007 |
| OPEN-007 | Pengelola: batas edit guru dan data wali? | Penugasan sendiri; submitted terkunci setelah final terkait; wali terbatas | M-002/M-006 |

Tidak ada keputusan ini yang membenarkan data dummy sebagai data produksi. Ubah dokumen pemilik aturan sebelum implementasi yang bergantung pada hasil validasi.

## Sumber resmi yang diperiksa
Diperiksa 14 Oktober 2026 untuk kemampuan platform dasar, bukan jaminan versi paket atau kelayakan akun:
- [Cloudflare React/Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/): React, dist, deployment pages.dev.
- [Pages Functions](https://developers.cloudflare.com/pages/functions/): backend pada Pages.
- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/): periksa batas saat provisioning, Functions memakai batas Workers terkait.
- [Supabase pricing](https://supabase.com/pricing): periksa kuota dan kebijakan free saat provisioning; tidak menambah akun untuk menganggap batas otomatis hilang.
- [Supabase password Auth](https://supabase.com/docs/guides/auth/passwords): email/phone sebagai identitas password, adapter username diperlukan.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): pembatasan akses database.
- [Supabase server-side Auth](https://supabase.com/docs/guides/auth/server-side): referensi mekanisme sesi server; rancangan opaque BFF pada paket ini perlu diuji tersendiri.
Changelog ringkas Supabase gagal diambil dalam sesi penyusunan; coding agent wajib memeriksa changelog resmi dan API SDK saat M-001. Tidak ada klaim semua versi/library terbaru telah diaudit.

[Arsitektur](./architecture.md) · [PRD](./prd.md)

## ADR-009 — Penutupan M-001 dan pengecualian keamanan terbatas (15 Oktober 2026)

**Status: Accepted by operator.** Operator menyatakan fitur Supabase *Leaked Password Protection* memerlukan paket Pro dan secara eksplisit menyetujui penutupan M-001 tanpa upgrade paket pada saat ini. Security Advisor masih memberi temuan WARN `auth_leaked_password_protection`; fitur **tidak diaktifkan dan tidak dianggap PASS**.

**Kontrol yang tersedia:** password minimum 12 karakter pada alur PortalGenius, validasi password berbeda, Supabase Auth mengelola hash/kredensial, pembatasan upaya login 8/15 menit per username serta batas IP, cookie HttpOnly/Secure, Origin/CSRF, RLS deny-by-default, sesi opaque/enkripsi, session revocation, dan audit provisioning. Kontrol ini mengurangi risiko tetapi **tidak setara dengan pemeriksaan daftar password bocor**.

**Bukti penerimaan fondasi:** GitHub Quality CI dengan npm audit 0, typecheck/build, 12 unit PASS; hosted API smoke 4/4; operator mengonfirmasi login, wajib ganti password, logout dan login ulang; SQL read-only 1 admin aktif dan 2 sesi revoked, RPC sesi revoked tidak membacanya. Lihat [closeout M-001](docs/milestones/M001-closeout.md).

**Pengecualian terpisah yang tidak boleh disembunyikan:** replay cookie melalui HTTP dan refresh paralel secara nyata belum dieksekusi; lint/format formal masih belum ada. Diperlukan sebagai gate awal M-002 dalam [issue #2](https://github.com/ferdilpu-sudo/PortalGenius/issues/2), sebelum provisioning banyak akun. Pengujian lintas role RLS menyusul ketika tabel M-002 tersedia. Ini bukan hasil PASS yang tertunda pelaporannya, tetapi tes yang **belum dilakukan**.

**Pilihan:** tidak membayar paket Pro semata untuk menutup milestone fondasi, tidak memalsukan hasil Security Advisor, dan tidak menghapus pembatasan autentikasi yang ada. Evaluasi upgrade/mitigasi proteksi password pada peninjauan keamanan berikutnya atau sebelum ekspansi penggunaan. Keputusan ini tidak menyatakan kesiapan untuk penyimpanan data siswa nyata maupun rilis M-007.
