import { existsSync } from 'node:fs';
for (const path of [
  'package.json','package-lock.json','src/main.tsx',
  'functions/api/v1/auth/login.ts',
  'supabase/migrations/20261015052905_portalgenius_m001_identity_session_foundation.sql',
  'supabase/migrations/20261015062143_portalgenius_m001_first_admin_bootstrap.sql',
  'scripts/bootstrap-admin.mjs',
  'scripts/bootstrap-admin.ps1',
]) {
  const ok=existsSync(path);
  console.log((ok?'PASS':'BLOCKED')+': '+path);
  if(!ok)process.exitCode=1;
}
