import { decryptTokens, digestHandle, encryptTokens, hmacString } from '../platform/crypto.ts';
import type { VerifiedEnv } from '../platform/env.ts';
import { authClient, privilegedClient } from '../platform/supabase.ts';
import { claimRefresh, finishRefresh, readSession } from './sessionRepository.ts';
type Tokens={accessToken:string;refreshToken:string;expiresAt:number};
export async function restoreSession(env:VerifiedEnv,handle:string) {
  const admin=privilegedClient(env);
  const hash=await digestHandle(handle);
  let record=await readSession(admin,hash);
  if(!record)return null;
  if(record.session.keyVersion!==Number(env.SESSION_KEY_VERSION))return null;
  let tokens=await decryptTokens<Tokens>(env.SESSION_ENCRYPTION_KEY,record.profile.id,record.session.encryptedTokens);
  if(tokens.expiresAt*1000<Date.now()+90000) {
    const claimed=await claimRefresh(admin,hash,record.session.version);
    if(!claimed)throw new Error('SESSION_REFRESH_BUSY');
    const {data,error}=await authClient(env).auth.refreshSession({refresh_token:tokens.refreshToken});
    if(error||!data.session)throw new Error('SESSION_REFRESH_FAILED');
    tokens={accessToken:data.session.access_token,refreshToken:data.session.refresh_token,expiresAt:data.session.expires_at??0};
    const encrypted=await encryptTokens(env.SESSION_ENCRYPTION_KEY,record.profile.id,tokens);
    if(!await finishRefresh(admin,hash,record.session.version,encrypted))throw new Error('SESSION_REFRESH_FAILED');
    record=await readSession(admin,hash);
    if(!record)return null;
  }
  const {data,error}=await authClient(env).auth.getUser(tokens.accessToken);
  if(error||data.user?.id!==record.profile.id)return null;
  return {profile:record.profile,csrf:await hmacString(env.SESSION_ENCRYPTION_KEY,'csrf',handle),hash};
}
