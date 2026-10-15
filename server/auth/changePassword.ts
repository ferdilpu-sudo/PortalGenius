import type { VerifiedEnv } from '../platform/env.ts';
import { authClient, privilegedClient } from '../platform/supabase.ts';
import { validatePasswordChange } from '../../contracts/auth/passwordValidation.ts';
import type { AccountProfile } from './sessionRepository.ts';
export async function changePassword(env:VerifiedEnv,profile:AccountProfile,payload:unknown):Promise<'changed'|'invalid'> {
  const input=validatePasswordChange(payload);
  if(!input)return 'invalid';
  const admin=privilegedClient(env);
  const {data:alias,error:aliasError}=await admin.rpc('pg_auth_alias_for_user',{p_auth_user_id:profile.id});
  if(aliasError||typeof alias!=='string')throw new Error('ALIAS_UNAVAILABLE');
  const {data:verified,error:verifyError}=await authClient(env).auth.signInWithPassword({
    email:alias,password:input.currentPassword
  });
  if(verifyError||verified.user?.id!==profile.id)return 'invalid';
  const {error:revokeError}=await admin.rpc('pg_auth_revoke_all_user_sessions',{p_auth_user_id:profile.id});
  if(revokeError)throw new Error('REVOKE_FAILED');
  const {error:updateError}=await admin.auth.admin.updateUserById(profile.id,{password:input.newPassword});
  if(updateError)throw new Error('PASSWORD_UPDATE_FAILED');
  const {error:markError}=await admin.rpc('pg_auth_password_changed',{p_auth_user_id:profile.id});
  if(markError)throw new Error('ACCOUNT_UPDATE_FAILED');
  return 'changed';
}
