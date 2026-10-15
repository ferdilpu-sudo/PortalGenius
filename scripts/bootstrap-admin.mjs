/**
 * One-time, explicit operator bootstrap. Run locally with Node.js 22+:
 * node --env-file=.dev.vars scripts/bootstrap-admin.mjs
 *
 * Requires Supabase service key loaded from private .dev.vars, never committed.
 * The generated temporary password is shown once in your local terminal.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'vpglikrkvsnoyjvluigs';

function fail(message) {
  throw new Error(message);
}

async function main() {
  if (!stdin.isTTY) fail('Bootstrap harus dijalankan pada terminal interaktif.');
  const endpoint = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const domain = process.env.AUTH_ALIAS_DOMAIN;
  const expected = process.env.EXPECTED_SUPABASE_PROJECT_REF;
  if (endpoint !== `https://${projectRef}.supabase.co` ||
      expected !== projectRef ||
      !serviceKey ||
      !domain ||
      !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(domain) ||
      !domain.includes('.')) {
    fail('Konfigurasi Supabase belum sesuai proyek PortalGenius.');
  }
  const io = createInterface({ input: stdin, output: stdout });
  let username, displayName;
  try {
    stdout.write('PortalGenius | Bootstrap administrator pertama\n');
    stdout.write(`Target Supabase: ${projectRef}\n\n`);
    username = (await io.question('Username admin [admin]: ')).trim().toLowerCase() || 'admin';
    displayName = (await io.question('Nama tampilan [Administrator]: ')).trim() || 'Administrator';
    if (!/^[a-z0-9._-]{3,32}$/.test(username) ||
        ['root','system','adminroot'].includes(username) ||
        displayName.length > 120) fail('Username atau nama tampilan tidak valid.');
    const approval = await io.question(`Ketik ${projectRef} untuk konfirmasi membuat admin pertama: `);
    if (approval.trim() !== projectRef) fail('Konfirmasi dibatalkan.');
  } finally {
    io.close();
  }
  const admin = createClient(endpoint,serviceKey,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const {count,error:countError} = await admin.from('accounts')
    .select('auth_user_id',{count:'exact',head:true});
  if (countError) fail('Tidak dapat memeriksa keadaan bootstrap. Periksa server credential.');
  if (count !== 0) fail('Bootstrap tertutup: sudah ada akun aplikasi.');
  const password = randomBytes(27).toString('base64url');
  const email = `pg-${randomUUID()}@${domain}`;
  const {data:created,error:authError}=await admin.auth.admin.createUser({
    email,password,email_confirm:true,app_metadata:{managed_by:'portalgenius'}
  });
  if (authError || !created?.user?.id) fail('Gagal membuat identitas Auth. Periksa kebijakan alias/domain.');
  const userId=created.user.id;
  const {error:linkError}=await admin.rpc('pg_auth_bootstrap_first_admin',{
    p_auth_user_id:userId,p_username:username,p_auth_alias:email,p_display_name:displayName
  });
  if(linkError) {
    // The RPC is all-or-nothing. Best-effort cleanup affects only the user created here.
    const {error:cleanupError}=await admin.auth.admin.deleteUser(userId);
    if (cleanupError) fail('Binding admin gagal; periksa Auth orphan dengan aman sebelum mengulang.');
    fail('Binding akun admin gagal; identitas sementara telah dibersihkan.');
  }
  // Never print the service key, auth alias, session token, or full provider responses.
  stdout.write('\nADMIN_BOOTSTRAP_SUCCESS\n');
  stdout.write(`Username: ${username}\n`);
  stdout.write(`Password sementara (salin sekali): ${password}\n`);
  stdout.write('Ganti password pada login pertama. Jangan menyimpan password di GitHub.\n');
}

main().catch(error=>{
  console.error('BOOTSTRAP_BLOCKED:',error instanceof Error?error.message:'Kesalahan tak dikenal.');
  process.exitCode=1;
});
