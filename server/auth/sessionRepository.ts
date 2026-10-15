import type { SupabaseClient } from '@supabase/supabase-js';
export type StoredSession={authUserId:string;encryptedTokens:string;keyVersion:number;version:number};
export type AccountProfile={id:string;displayName:string;mustChangePassword:boolean;roles:('admin'|'teacher'|'counselor'|'principal')[]};
export async function claimLoginAttempt(admin:SupabaseClient,bucket:string,limit:number):Promise<boolean> {
  const {data,error}=await admin.rpc('pg_auth_login_slot',{p_key_hash:bucket,p_limit:limit});
  if(error||typeof data!=='boolean')throw new Error('LOGIN_RATE_UNAVAILABLE');
  return data;
}
export async function resolveAlias(admin:SupabaseClient,username:string):Promise<{id:string;alias:string}|null> {
  const {data,error}=await admin.rpc('pg_auth_resolve_alias',{p_username:username});
  if(error)throw new Error('IDENTITY_LOOKUP_UNAVAILABLE');
  if(!data)return null;
  if(typeof data!=='object'||typeof data.auth_user_id!=='string'||typeof data.auth_alias!=='string')
    throw new Error('IDENTITY_LOOKUP_INVALID');
  return {id:data.auth_user_id,alias:data.auth_alias};
}
export async function storeSession(admin:SupabaseClient,input:{hash:string;userId:string;encrypted:string;keyVersion:number}):Promise<void> {
  const {error}=await admin.rpc('pg_auth_session_store',{
    p_handle_hash:input.hash,p_auth_user_id:input.userId,p_encrypted_tokens:input.encrypted,p_key_version:input.keyVersion
  });
  if(error)throw new Error('SESSION_STORE_FAILED');
}
export async function readSession(admin:SupabaseClient,hash:string):
  Promise<{profile:AccountProfile;session:StoredSession}|null> {
  const {data,error}=await admin.rpc('pg_auth_session_get',{p_handle_hash:hash});
  if(error)throw new Error('SESSION_LOOKUP_FAILED');
  if(!data)return null;
  return {
    profile:{
      id:data.auth_user_id as string,displayName:data.display_name as string,
      mustChangePassword:data.must_change_password as boolean,roles:data.roles as AccountProfile['roles']
    },
    session:{
      authUserId:data.auth_user_id as string,encryptedTokens:data.encrypted_tokens as string,
      keyVersion:data.key_version as number,version:data.version as number
    }
  };
}
export async function revokeSession(admin:SupabaseClient,hash:string):Promise<void> {
  const {error}=await admin.rpc('pg_auth_session_revoke',{p_handle_hash:hash});
  if(error)throw new Error('SESSION_REVOKE_FAILED');
}
export async function claimRefresh(admin:SupabaseClient,hash:string,version:number):Promise<boolean> {
  const {data,error}=await admin.rpc('pg_auth_session_claim_refresh',{p_handle_hash:hash,p_expected_version:version});
  if(error)throw new Error('SESSION_REFRESH_UNAVAILABLE');
  return data===true;
}
export async function finishRefresh(admin:SupabaseClient,hash:string,version:number,encrypted:string):Promise<boolean> {
  const {data,error}=await admin.rpc('pg_auth_session_finish_refresh',{
    p_handle_hash:hash,p_expected_version:version,p_encrypted_tokens:encrypted
  });
  if(error)throw new Error('SESSION_REFRESH_UNAVAILABLE');
  return data===true;
}
