# PortalGenius — Staging Cloudflare Pages M-001

Status: URL produksi-staging **sudah ter-deploy**; empat pemeriksaan smoke API hosted telah PASS. Login akun administrator nyata belum diuji.
Tanggal: 15 Oktober 2026. Lakukan konfigurasi hanya melalui dashboard Cloudflare, bukan dalam GitHub source, chat, atau issue.

## 1. Koneksi GitHub dan build

1. Buka Cloudflare Dashboard > **Workers & Pages** > **Create application** > **Pages** > **Import an existing Git repository**.
2. Hubungkan akun GitHub yang memiliki repo `ferdilpu-sudo/PortalGenius`.
3. Pilih repo `PortalGenius`. Untuk stage awal, gunakan **production branch** `feat/m001-foundation-auth` karena `main` masih dikunci sampai seluruh M-001 gate lulus.
4. Buat nama Pages yang tersedia, misalnya `portalgenius-m001-stage` (nama aktual dan URL harus dicatat, jangan diasumsikan). Gunakan **root directory** `/`, **build command** `npm run build`, **output directory** `dist`, **Node.js 22**. Dependencies pinned via package-lock + `npm ci` pada GitHub CI.
5. Setelah merge PR terverifikasi nanti, baru ubah production branch ke `main`, atau pindah ke proyek produksi terpisah; jangan anggap `main` sudah bisa dideploy saat ini.
6. Jangan gunakan unggahan aset statis melalui dashboard untuk menggantikan Pages Functions: route `/api/v1/*` harus ter-deploy sebagai Functions.

Rujukan: https://developers.cloudflare.com/pages/get-started/git-integration/ dan https://developers.cloudflare.com/pages/configuration/branch-build-controls/

## 2. Runtime bindings (Settings > Variables and Secrets)

Masukkan pada **Production environment** untuk hostname utama `https://portalgenius.pages.dev` (Preview hanya untuk hostname preview). Semua perubahan variable atau secret harus diikuti deployment baru. Jangan memasukkan nilai secret dalam chat/GitHub. Status smoke 15 Oktober 2026 setelah konfigurasi diperbaiki: health=200, sesi anonim=401, origin asing=403, username tak dikenal=401 (semua PASS).

| Nama | Jenis | Keterangan |
|---|---|---|
| `SUPABASE_URL` | variable | `https://vpglikrkvsnoyjvluigs.supabase.co` |
| `EXPECTED_SUPABASE_PROJECT_REF` | variable | `vpglikrkvsnoyjvluigs` |
| `SUPABASE_PUBLISHABLE_KEY` | variable | publishable API key untuk proyek ini |
| `SUPABASE_SECRET_KEY` | **encrypted secret** | key server-side khusus proyek ini (tidak memakai key browser) |
| `SESSION_ENCRYPTION_KEY` | **encrypted secret** | 32 byte acak base64url, bukan password manusia |
| `SESSION_KEY_VERSION` | variable | `1` |
| `APP_ENV` | variable | `staging` |
| `APP_ORIGIN` | variable | origin HTTPS dari **URL Pages aktual**, tanpa slash akhir |
| `AUTH_ALIAS_DOMAIN` | variable (bootstrap only) | domain email alias internal untuk provisioning admin di terminal lokal; **tidak wajib untuk runtime Pages** |

Untuk menghasilkan session encryption key secara lokal pada Windows PowerShell, dengan Node.js terpasang:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Simpan hasilnya di **encrypted secret** Cloudflare dan file `.dev.vars` lokal (gitignored). Jangan tempelkan hasilnya di chat, commit, atau GitHub Actions logs. `AUTH_ALIAS_DOMAIN` harus menggunakan domain yang sah untuk alias Auth internal; jika belum ada, jangan mengarang alamat.

Rujukan: https://developers.cloudflare.com/pages/functions/bindings/

## 3. Supabase Auth

- Project ref HARUS `vpglikrkvsnoyjvluigs`, bukan proyek LayarBelajar.
- Nonaktifkan **public sign-up**, aktifkan proteksi brute force bawaan bila tersedia. Akun hanya dibuat oleh operator terpercaya.
- Pastikan migrasi `20261015052905`, `20261015053715`, dan `20261015062143` sudah ada.
- Jangan memasukkan secret key ke `VITE_*`, `wrangler.toml`, atau JavaScript browser.

## 4. Bootstrap admin pertama (lokal, satu kali)

1. Clone branch `feat/m001-foundation-auth` pada PC admin.
2. Jalankan `npm ci` (Node 22+).
3. Gunakan helper Windows di bawah agar secret hanya dimasukkan sebagai input tersembunyi. Alternatif manual melalui `.dev.vars` tetap tersedia untuk operator pengembang; pastikan tidak ter-commit atau disalin ke chat.
4. Jalankan secara interaktif, tanpa screen recording dan tanpa membagikan output:

```powershell
node --env-file=.dev.vars scripts/bootstrap-admin.mjs
```

5. Ketik username, nama, dan konfirmasi project ref. Password sementara acak akan ditampilkan **sekali** di terminal. Simpan di password manager, bukan repo/chat.
6. Login melalui Pages HTTPS dan ganti password sementara. Jika admin sudah ada, bootstrap akan ditolak — bukan diperbaiki dengan menghapus database.

### Cara Windows yang direkomendasikan (tanpa file secret)

Jika Node.js 22+ dan `npm ci` sudah tersedia di checkout, jalankan pada **Windows PowerShell**:

```powershell
powershell -NoProfile -File .\scripts\bootstrap-admin.ps1
```

Helper ini meminta **domain alias Auth internal milik lembaga** dan Supabase **Secret API Key** secara interaktif (input secret tersembunyi). Tidak perlu membuat file `.dev.vars` untuk bootstrap. Jangan menggunakan publishable key. Selesai atau gagal, variabel rahasia proses PowerShell dibersihkan. Domain ini hanya alias login internal, bukan username yang terlihat siswa/guru.

Setelah muncul `ADMIN_BOOTSTRAP_SUCCESS`, simpan password sementara di password manager pribadi (tidak perlu mengirim ke chat), lalu masuk ke `https://portalgenius.pages.dev/` menggunakan username dan password tersebut. Penggantian password pertama wajib dilalui, kemudian login lagi dan logout. Jika **tidak** muncul `ADMIN_BOOTSTRAP_SUCCESS`, hanya bagikan kode/teks error tanpa kredensial, email alias, atau token. Script memiliki guard hanya boleh dijalankan sebelum terdapat akun aplikasi.

**Penting:** jangan menghapus akun atau mengulang bootstrap dengan memaksa penghapusan data ketika ada masalah; minta peninjauan status terlebih dahulu.

## 5. Bukti gate hosted

Pada terminal yang memiliki akses Internet, jalankan:

```powershell
node scripts/hosted-smoke.mjs https://YOUR-STAGING.pages.dev
```

Target: health=200; session anon=401; foreign Origin=403; unknown user login=401 tanpa perbedaan pesan. Setelah itu lakukan **manual TEST-001** melalui browser: admin login, wajib ganti password, login kembali, logout, replay cookie lama ditolak. Pemeriksaan browser/refresh paralel dan pengujian akses database negatif tetap wajib.

Jangan melakukan uji concurrency atau reset database pada lingkungan berisi siswa nyata. Jangan merge PR #1 sebelum seluruh gate yang relevan PASS.

## 6. Eskalasi kegagalan

- Health API 404: Pages Functions tidak diikutsertakan atau routing salah.
- Login menghasilkan 503 untuk username tak dikenal: runtime variables/secrets atau akses Supabase belum benar; jangan tampilkan key.
- Login 403 bahkan dari browser asli: periksa `APP_ORIGIN` persis sesuai origin host; preview `*.pages.dev` punya origin berbeda.
- Cookie tak tersimpan: akses wajib HTTPS di hosted dan jangan campur hostname preview/production.
- Browser menampilkan dashboard tetapi tidak ada profil: periksa sesi Auth dan izin RPC server secara terpisah.

Laporan gate masuk ke `M001-STATUS.md`, tanpa kredensial atau identitas siswa.
