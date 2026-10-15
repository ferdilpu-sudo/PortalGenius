import { validateCredentials } from '../../contracts/auth/loginValidation.ts';
import { digestHandle, encryptTokens, hmacString, newSessionHandle } from '../platform/crypto.ts';
import type { VerifiedEnv } from '../platform/env.ts';
import { authClient, privilegedClient } from '../platform/supabase.ts';
import { claimLoginAttempt, readSession, resolveAlias, storeSession } from './sessionRepository.ts';
export async function loginService(env:VerifiedEnv,raw:unknown,ip:string):
  Promise<{handle:string;profile:NonNullable<Awaited<ReturnType<typeof readSession>>>['profile'];csrf:string}|null> {
  const input=validateCredentials(raw);
  if(!input)return null;
  const admin=privilegedClient(env);
  const ipBucket=await hmacString(env.SESSION_ENCRYPTION_KEY,'login-throttle','ip:'+ip);
  const userBucket=await hmacString(env.SESSION_ENCRYPTION_KEY,'login-throttle','username:'+input.username);
  const allowedIp=await claimLoginAttempt(admin,ipBucket,30);
  const allowedUser=await claimLoginAttempt(admin,userBucket,8);
  if(!allowedIp||!allowedUser)throw new Error('LOGIN_RATE_LIMIT');
  const account=await resolveAlias(admin,input.username);
  if(!account)return null;
  const {data,error}=await authClient(env).auth.signInWithPassword({email:account.alias,password:input.password});
  if(error||!data.session||data.user?.id!==account.id)return null;
  const handle=newSessionHandle();
  const encrypted=await encryptTokens(env.SESSION_ENCRYPTION_KEY,account.id,{
    accessToken:data.session.access_token,refreshToken:data.session.refresh_token,
    expiresAt:data.session.expires_at??0
  });
  const hash=await digestHandle(handle);
  await storeSession(admin,{hash,userId:account.id,encrypted,keyVersion:Number(env.SESSION_KEY_VERSION)});
  const record=await readSession(admin,hash);
  if(!record)throw new Error('SESSION_CONFIRMATION_FAILED');
  return {handle,profile:record.profile,csrf:await hmacString(env.SESSION_ENCRYPTION_KEY,'csrf',handle)};
}
