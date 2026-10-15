> **Status verifikasi 15 Oktober 2026:** Fondasi M-001 diterima dan ditutup dengan pengecualian terdokumentasi. Rujuk [M001 closeout](docs/milestones/M001-closeout.md), [ADR-009](decisions.md), dan [M-002 security carry-forward](https://github.com/ferdilpu-sudo/PortalGenius/issues/2).

# PortalGenius — Rencana Pengujian

Status 15 Oktober 2026: GitHub Quality CI terakhir **12/12 unit PASS, npm audit 0, typecheck/build PASS**. Hosted API smoke **4/4 PASS**, operator mengonfirmasi bootstrap, wajib ganti password, logout dan login ulang; DB menegaskan akun admin aktif dan sesi lama dicabut. Read-only SQL mengonfirmasi dua sesi revoked tidak dapat dibaca melalui RPC. **NOT RUN:** uji browser replay cookie asli/sintetis, refresh paralel, lint formal, multi-role negatif RLS (M-002). Semua pengecualian dicatat dengan owner dan gate pada issue #2. Angka unit dari prototipe ZIP sebelumnya tidak dipakai sebagai bukti CI ini.

## Catatan TEST-001 M-001

TEST-001 **PARTIAL PASS, operator-accepted exception**: login, rotasi password, logout dan relogin telah terbukti. Replay cookie pada HTTP dan refresh paralel belum diuji. Uji lanjut diwajibkan sebelum provisioning multi-pengguna pada M-002; penutupan M-001 tidak mengubah status subtes NOT RUN.

## Strategi
Unit Vitest pada aturan nilai, kategori kehadiran dan transisi status. Integration pada Postgres/RLS, Auth/BFF dan transaksi menggunakan lingkungan uji. UI Testing Library untuk interaksi form. Playwright untuk perjalanan utama; axe-core ditambah pengujian manual keyboard, zoom dan screen reader. Mocks untuk gangguan layanan, bukan pengganti uji RLS dengan role sebenarnya.

## Lingkungan
| Target | Setup | Pemeriksaan |
|---|---|---|
| Desktop | Chrome/Edge stabil Windows, 1280 dan 1440 px | Admin, tabel nilai, ekspor |
| Mobile | Android Chrome nyata, 360 px; emulasi 390 px | Guru, touch, koneksi lambat |
| Tablet | 768 px emulasi | Layout transisi |
| Aksesibilitas | Keyboard, zoom 200%, NVDA atau pembaca layar tersedia | Focus/labels/error announcements |
| DB | Supabase lokal baru, fixtures sintetis | RLS tiap peran dan transaksi |
| Hosted staging | Data sintetis, konfigurasi sama produksi tanpa secrets produksi | Cookies HTTPS, CSRF, origin, provider reset |

Akun uji: admin, guru A/B dengan peserta berbeda, konselor A/B, kepala sekolah, pengguna nonaktif. Siswa Uji A/B dengan nama tampilan sama tetapi NIS berbeda; satu siswa diarsip; dua semester. Jangan menyalin siswa asli dari Excel.

## Matriks keterlacakan
| Test | REQ | AC | Lapisan dan langkah | Hasil yang diharapkan |
|---|---|---|---|---|
| TEST-001 | REQ-001 | AC-001 | Hosted/API: login username kapital/spasi, salah password, wajib ganti, refresh paralel, logout/reset lalu replay cookie | Normalisasi benar; gagal generik; sesi lama ditolak; tidak ada token di JS |
| TEST-002 | REQ-002 | AC-002 | API/SQL: guru A meminta ID siswa/jurnal B, principal POST nilai, anon query tabel, self-role escalation, hapus admin terakhir | Semua akses negatif ditolak; role sah tetap berfungsi |
| TEST-003 | REQ-003 | AC-003 | Integration/UI: NIS duplikat, kelas 8 SD, semester overlap, arsip siswa, data wali pada respons guru | Invalid ditolak; histori utuh; wali tidak bocor |
| TEST-004 | REQ-004 | AC-004 | Integration: assignment sebelum/sesudah masa aktif, peserta tanpa assignment, individual 2 peserta | Di luar cakupan ditolak; individual hanya satu |
| TEST-005 | REQ-005 | AC-005 | API/E2E: jurnal 3 siswa, dua sesi materi identik, retry timeout sama key, stale PATCH | Materi sekali, catatan terpisah, dua sesi sah, retry satu record, konflik 409 |
| TEST-006 | REQ-006 | AC-006 | Unit/SQL: 2 tatap hadir +1 Zoom hadir +1 Independence hadir +1 Zoom izin | Hadir=2, Zoom=1, Independence=1, Izin=1,total=5; draft tak dihitung |
| TEST-007 | REQ-007 | AC-007 | Unit/SQL: 80/70/90/80 bobot20/20/30/30; null, nol, bobot99, kategori0%, nilai>max | 81,00; null incomplete; nol sah; invalid bobot ditolak; tanpa double-count jurnal |
| TEST-008 | REQ-008 | AC-008 | Integration/UI: sikap belum lengkap, no_notes eksplisit, konselor B membaca A, ekspor private note | Draft boleh; final tidak lengkap ditolak; private note tak bocor |
| TEST-009 | REQ-009 | AC-009 | E2E: pilih A September lalu B Oktober, respons A sengaja terlambat, bulan kosong | Hanya siswa/periode aktif; tidak ada data lama/stale |
| TEST-010 | REQ-010 | AC-010 | Integration: edit sumber saat preview, dua finalisasi paralel, revisi beralasan | Stale409; satu versi final; snapshot lama tetap setelah revisi |
| TEST-011 | REQ-011 | AC-011 | Export: 1/30/100/600 baris, catatan panjang, nama panjang, formula-like text, role dicabut | Semua baris muncul; A4 terbaca; XLSX literal; akses baru ditolak |
| TEST-012 | REQ-012 | AC-012 | E2E: beranda tiap role, filter periode dan klik ringkasan | Scope benar, hitungan sama daftar, principal hanya final |
| TEST-013 | REQ-013 | AC-013 | UI/manual: 360/768/1280/1440, keyboard, 200% zoom, offline saat submit, response503 | Tidak overflow global; focus terlihat; isian terjaga; tidak ada sukses palsu/emoji |
| TEST-014 | REQ-014 | AC-014 | Integration/ops: perubahan sensitif, log scan, backup/restore sintetis | Actor+event tercatat tanpa secrets; restore jumlah/FK/snapshot cocok |

## Negatif yang wajib
TEST-001 juga menguji username tak dikenal dengan status/pesan sama, rate-limit lintas instance, secret/client bundle scan, sesi kedaluwarsa dan nonaktif segera ditolak, CSRF/Origin salah, recovery admin. TEST-002 mencakup direct Data API dan bukan hanya BFF. TEST-005 menguji transaksi rollback bila satu peserta invalid. TEST-007 membandingkan hasil domain dan SQL, pembulatan 80.005, score nol, kategori berbobot nol. TEST-010 menguji final report immutable lewat SQL user role. TEST-011 memeriksa output dengan parser PDF/XLSX dan render semua halaman, bukan sekadar download sukses.

## Tooling dan perintah
Direncanakan — verifikasi setelah scaffolding. Script npm berikut harus didefinisikan pada M-001, tidak tersedia dalam paket spesifikasi:
```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
```
Integration tidak boleh menyasar produksi. Sebelum reset DB, pastikan allowlist host lokal dan project ID uji. Discover Supabase CLI via --help, jangan mengarang flag. Untuk test hosted gunakan fixture berscope run ID dan cleanup yang tidak menyentuh data pengguna.

## Gate CI dan rilis
Setiap perubahan: format/lint/typecheck, unit relevan dan build. Auth/schema: integration/RLS wajib. Workflow UI: E2E terkait. Ekspor: render/parse wajib. Uji ulang lebih luas hanya saat batas bersama berubah atau menjelang rilis. Security/dependency findings triage berdasarkan dampak aktual, bukan menganggap audit nol sebagai bukti aman.
MVP tidak dirilis jika ada akses lintas penugasan, data hilang, hasil nilai salah, PDF siswa tertukar, snapshot final berubah, atau password/token bocor. Target kinerja di PRD diuji 10 pengguna paralel dengan data sintetis 1 tahun; laporkan mesin, jaringan, latency, payload dan kegagalan. Target waktu adalah target, belum hasil.

## Pelaporan
Catat TEST ID, tanggal, environment, command, PASS/FAIL/NOT RUN, bukti tanpa data pribadi dan sisa risiko pada PR atau log CI. Status rencana di [plan](./plan.md) baru Verified setelah bukti tersedia. Untuk ketentuan UI: [design](./design.md).