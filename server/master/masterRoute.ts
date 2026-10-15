import type {SupabaseClient} from '@supabase/supabase-js';
import type {PageContext} from '../platform/context.ts';
import {verifyEnv} from '../platform/env.ts';
import {getCookie,SESSION_COOKIE} from '../platform/cookie.ts';
import {restoreSession} from '../auth/restoreSession.ts';
import {hasAdminAccess} from '../../contracts/auth/roles.ts';
import {isTrustedMutation,readSmallJson} from '../platform/requestGuard.ts';
import {verifyCsrf} from '../platform/crypto.ts';
import {privilegedClient} from '../platform/supabase.ts';
import {failure,success,unavailable} from '../platform/responses.ts';
import {isUUID} from '../../contracts/master/academicYearValidation.ts';

export function masterList<T>(list:(db:SupabaseClient)=>Promise<T[]>){
 return async ({request,env}:PageContext):Promise<Response>=>{
  const id=crypto.randomUUID(),handle=getCookie(request,SESSION_COOKIE);
  if(!handle)return failure(id,401,'NOT_AUTHENTICATED','Silakan masuk.');
  try{
   const cfg=verifyEnv(env);
   const session=await restoreSession(cfg,handle);
   if(!session)return failure(id,401,'NOT_AUTHENTICATED','Sesi tidak berlaku.');
   if(!hasAdminAccess(session.profile))return failure(id,403,'FORBIDDEN','Akses hanya untuk administrator.');
   return success(id,await list(privilegedClient(cfg)));
  }catch{return unavailable(id);}
 };
}
export function masterCreate<I,T>(
 validate:(value:unknown)=>I|null,
 create:(db:SupabaseClient,input:I,actorId:string,key:string,requestId:string)=>Promise<T>
){
 return async ({request,env}:PageContext):Promise<Response>=>{
  const id=crypto.randomUUID();
  try{
   // Fail closed at the HTTP boundary, even if Preview secrets are absent.
   // These checks do not authenticate a user or claim the backend is ready.
   const requestOrigin=new URL(request.url).origin;
   if(!isTrustedMutation(request,requestOrigin))
    return failure(id,403,'ORIGIN_DENIED','Permintaan tidak diizinkan.');
   const handle=getCookie(request,SESSION_COOKIE);
   if(!handle)return failure(id,401,'NOT_AUTHENTICATED','Silakan masuk.');
   const cfg=verifyEnv(env);
   // Authenticated mutations must ALSO match the configured app origin.
   if(!isTrustedMutation(request,cfg.APP_ORIGIN))
    return failure(id,403,'ORIGIN_DENIED','Permintaan tidak diizinkan.');
   if(!await verifyCsrf(cfg.SESSION_ENCRYPTION_KEY,handle,request.headers.get('X-CSRF-Token')))
    return failure(id,403,'CSRF_DENIED','Permintaan tidak diizinkan.');
   const session=await restoreSession(cfg,handle);
   if(!session)return failure(id,401,'NOT_AUTHENTICATED','Sesi tidak berlaku.');
   if(!hasAdminAccess(session.profile))return failure(id,403,'FORBIDDEN','Akses hanya untuk administrator.');
   const key=request.headers.get('Idempotency-Key');
   if(!isUUID(key))return failure(id,422,'INVALID_IDEMPOTENCY_KEY','Kunci permintaan tidak sesuai.');
   const value=validate(await readSmallJson(request));
   if(!value)return failure(id,422,'INVALID_INPUT','Periksa data master akademik.');
   return success(id,await create(privilegedClient(cfg),value,session.profile.id,key!,id),201);
  }catch(e){
   if(e instanceof Error && e.message==='MASTER_CONFLICT')return failure(id,409,'CONFLICT','Data sudah ada, bertabrakan, atau kunci pengulangan berbeda.');
   if(e instanceof Error && e.message==='MASTER_NOT_FOUND')return failure(id,422,'INVALID_REFERENCE','Tahun ajaran tidak ditemukan.');
   if(e instanceof Error && e.message==='MASTER_INVALID')return failure(id,422,'INVALID_INPUT','Periksa nilai dan rentang tanggal.');
   if(e instanceof Error && e.message==='FORBIDDEN')return failure(id,403,'FORBIDDEN','Akses ditolak.');
   if(e instanceof SyntaxError||e instanceof Error&&['INVALID_CONTENT_TYPE','BODY_TOO_LARGE'].includes(e.message))
    return failure(id,422,'INVALID_INPUT','Format data tidak sesuai.');
   return unavailable(id);
  }
 };
}
