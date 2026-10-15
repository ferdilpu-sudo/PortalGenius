import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { technicalAuthAlias } from '../../server/accounts/technicalAuthAlias.ts';
import { newTemporaryPassword } from '../../server/accounts/newTemporaryPassword.ts';

/**
 * Local GoTrue compatibility probe, never sends secrets to a remote Supabase.
 * Uses only the isolated CLI project's local keys passed by PowerShell.
 */
export function assertLocalQaUrl(value) {
  let url;
  try { url = new URL(value); }
  catch { throw new Error('LOCAL_QA_REMOTE_URL_REJECTED'); }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ||
      url.port !== '55321' || url.pathname !== '/' || url.origin !== value) {
    throw new Error('LOCAL_QA_REMOTE_URL_REJECTED');
  }
  return url.origin;
}
export function localClient(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}
async function main() {
  const url = assertLocalQaUrl(process.env.PG_QA_LOCAL_URL);
  const adminKey = process.env.PG_QA_LOCAL_SERVICE_KEY;
  const anonKey = process.env.PG_QA_LOCAL_ANON_KEY;
  if (!adminKey || !anonKey) throw new Error('LOCAL_QA_LOCAL_KEYS_MISSING');
  const admin = localClient(url, adminKey);
  const anonymous = localClient(url, anonKey);
  const email = technicalAuthAlias(randomUUID());
  const initialPassword = newTemporaryPassword();
  const replacementPassword = newTemporaryPassword();
  let createdId = null;
  let cleaned = false;
  try {
    const created = await admin.auth.admin.createUser({
      email, password: initialPassword, email_confirm: true,
      app_metadata: {
        managed_by: 'portalgenius', identity_kind: 'technical_email_no_delivery'
      }
    });
    if (created.error || !created.data.user?.id) {
      console.error('BLOCKED local Auth did not accept the technical .invalid alias');
      console.error('LOCAL_QA_AUTH_REJECTION_CODE ' + (created.error?.code ?? 'unknown'));
      throw new Error('LOCAL_QA_PROVIDER_REJECTED_ALIAS');
    }
    createdId = created.data.user.id;
    if (created.data.user.email !== email || !created.data.user.email_confirmed_at) {
      throw new Error('LOCAL_QA_AUTH_USER_METADATA_INVALID');
    }
    console.log('PASS local Auth accepted nondeliverable technical alias');

    const first = await anonymous.auth.signInWithPassword({
      email, password: initialPassword
    });
    if (first.error || first.data.user?.id !== createdId)
      throw new Error('LOCAL_QA_INITIAL_SIGNIN_FAILED');
    console.log('PASS local Auth initial username-mapped sign-in');

    const updated = await admin.auth.admin.updateUserById(
      createdId, { password: replacementPassword }
    );
    if (updated.error) throw new Error('LOCAL_QA_PASSWORD_UPDATE_FAILED');
    console.log('PASS local Auth admin password reset');

    const oldPasswordLogin = await anonymous.auth.signInWithPassword({
      email, password: initialPassword
    });
    if (!oldPasswordLogin.error)
      throw new Error('LOCAL_QA_OLD_PASSWORD_STILL_ACCEPTED');
    console.log('PASS local Auth old password rejected');

    const newPasswordLogin = await anonymous.auth.signInWithPassword({
      email, password: replacementPassword
    });
    if (newPasswordLogin.error || newPasswordLogin.data.user?.id !== createdId)
      throw new Error('LOCAL_QA_NEW_PASSWORD_SIGNIN_FAILED');
    console.log('PASS local Auth new password accepted');

    const deleted = await admin.auth.admin.deleteUser(createdId);
    if (deleted.error) throw new Error('LOCAL_QA_DELETE_FAILED');
    cleaned = true;
    createdId = null;
    console.log('PASS local Auth synthetic user cleaned');

    const deletedLogin = await anonymous.auth.signInWithPassword({
      email, password: replacementPassword
    });
    if (!deletedLogin.error)
      throw new Error('LOCAL_QA_DELETED_USER_CAN_SIGNIN');
    console.log('PASS local Auth deleted user no longer signs in');
    console.log('LOCAL_AUTH_PROVIDER_QA_PASS: 6 checks; no hosted project accessed');
  } finally {
    if (createdId && !cleaned) {
      const cleanup = await admin.auth.admin.deleteUser(createdId);
      if (cleanup.error) {
        console.error('BLOCKED local cleanup requires attention; isolated stack will be removed');
        throw new Error('LOCAL_QA_CLEANUP_FAILED');
      }
    }
  }
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1].replaceAll('\\', '/')).href) {
  main().catch(error => {
    console.error('LOCAL_AUTH_PROVIDER_QA_BLOCKED: ' +
      (error instanceof Error ? error.message : 'UNKNOWN'));
    process.exitCode = 1;
  });
}
