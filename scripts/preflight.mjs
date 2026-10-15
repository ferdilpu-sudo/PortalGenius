import { existsSync } from 'node:fs';
for (const path of ['package.json','src/main.tsx','functions/api/v1/auth/login.ts','supabase/migrations/20261015052905_portalgenius_m001_identity_session_foundation.sql']) {
  const ok=existsSync(path);
  console.log((ok?'PASS':'BLOCKED')+': '+path);
  if (!ok) process.exitCode=1;
}
if (!existsSync('package-lock.json')) console.log('BLOCKED: package-lock.json belum tersedia; CI menggunakan npm install sementara.');
