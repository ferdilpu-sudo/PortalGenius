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
| `AUTH_ADMIN_EMAIL` | hanya lokal bootstrap | alamat email administrator lengkap milik operator, tidak ditaruh di Cloudflare Pages |

Untuk menghasilkan session encryption key secara lokal pada Windows PowerShell, dengan Node.js terpasang:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Simpan hasilnya di **encrypted secret** Cloudflare dan file `.dev.vars` lokal (gitignored). Jangan tempelkan hasilnya di chat, commit, atau GitHub Actions logs. Email lengkap milik operator cukup untuk bootstrap administrator pertama.

Rujukan: https://developers.cloudflare.com/pages/functions/bindings/

## 3. Supabase Auth

- Project ref HARUS `vpglikrkvsnoyjvluigs`, bukan proyek LayarBelajar.
- Nonaktifkan **public sign-up**, aktifkan proteksi brute force bawaan bila tersedia. Akun hanya dibuat oleh operator terpercaya.
- Pastikan migrasi `20261015052905`, `20261015053715`, dan `20261015062143` sudah ada.
- Jangan memasukkan secret key ke `VITE_*`, `wrangler.toml`, atau JavaScript browser.

## 4. Bootstrap admin pertama (lokal, satu kali)

Gunakan **alamat email lengkap yang dimiliki operator**, bukan hanya domain. Akun Gmail yang sudah digunakan juga dapat menjadi identitas teknis Supabase Auth bagi administrator pertama. Di PortalGenius, login tetap **username + password**, bukan email.

1. Di komputer Windows tepercaya, perbarui branch `feat/m001-foundation-auth` dan jalankan `npm ci`.
2. Jalankan:

```powershell
powershell -NoProfile -File .\scripts\bootstrap-admin.ps1
```

3. Masukkan email administrator lengkap, lalu Secret API Key Supabase melalui input tersembunyi, bukan publishable key.
4. Masukkan username, nama tampilan, lalu ketik project ref untuk konfirmasi. Jika `ADMIN_BOOTSTRAP_SUCCESS` muncul, simpan password sementara hanya di password manager.
5. Login di `https://portalgenius.pages.dev`, wajib ganti password, login lagi, lalu logout. Jangan bagikan password/API key/email alias dalam log.

Alternatif untuk pengembang yang memakai file `.dev.vars` gitignored: isi `SUPABASE_URL`, `EXPECTED_SUPABASE_PROJECT_REF`, `SUPABASE_SECRET_KEY`, `AUTH_ADMIN_EMAIL`. Jalankan `node --env-file=.dev.vars scripts/bootstrap-admin.mjs`.

Jika gagal, jangan menghapus akun atau memaksa bootstrap ulang. Bagikan kode error tanpa kredensial.

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
