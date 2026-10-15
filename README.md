# PortalGenius

Sistem administrasi akademik internal homeschooling jenjang SD, SMP, dan SMA.

## Status — M-001

Source implementasi fondasi dan autentikasi sedang diverifikasi. Supabase dedicated project: `vpglikrkvsnoyjvluigs`; migrasi SQL `20261015052905_portalgenius_m001_identity_session_foundation` telah diterapkan, tabel aplikasi tetap kosong. Frontend React/TypeScript dengan backend Cloudflare Pages Functions, tanpa password/email pengguna ditampilkan pada UI.

Untuk pengembangan lokal: Node 22+, `npm ci`, `npm run dev` untuk UI, lalu `npm run build` dan `npx wrangler pages dev dist` untuk API. Atur rahasia pada `.dev.vars` atau pengaturan secret Cloudflare dari contoh. Jangan mengirim secret ke repository.

**Belum untuk produksi:** akun admin awal dan secrets Cloudflare belum dikonfigurasi, browser/hosted login QA belum selesai. Setiap perbaikan harus melalui PR dan quality gate sebelum merge.

## Deploy staging M-001

Ikuti [runbook Cloudflare Pages](docs/deployment/cloudflare-pages-m001.md). URL deployment dan secret Cloudflare belum disiapkan. Untuk smoke hosted setelah konfigurasi jalankan `node scripts/hosted-smoke.mjs https://YOUR-STAGING.pages.dev`. Untuk bootstrap admin satu kali gunakan `node --env-file=.dev.vars scripts/bootstrap-admin.mjs` di terminal lokal operator tepercaya.

Semua API bisnis baru M-002 harus memakai otorisasi sesuai JWT pemanggil/penugasan; jangan melakukan akses bisnis melalui klien `service_role` tanpa periksa izin resource.

Untuk operator Windows, gunakan `powershell -NoProfile -File .\\scripts\\bootstrap-admin.ps1` setelah `npm ci`; helper meminta secret Supabase melalui input tersembunyi. Lihat runbook Cloudflare untuk langkah terperinci.

Bootstrap administrator pertama meminta alamat email operator yang dimiliki sendiri dan Supabase Secret API Key secara tersembunyi. Username dan password tetap merupakan satu-satunya input login aplikasi.
