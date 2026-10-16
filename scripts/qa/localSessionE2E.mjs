import {createServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {createClient} from '@supabase/supabase-js';
import {assertLocalQaUrl,localClient} from './localAuthProbe.mjs';
import {technicalAuthAlias} from '../../server/accounts/technicalAuthAlias.ts';
import {newTemporaryPassword} from '../../server/accounts/newTemporaryPassword.ts';
import {base64url,decryptTokens,digestHandle,encryptTokens} from '../../server/platform/crypto.ts';
import {onRequestPost as login} from '../../functions/api/v1/auth/login.ts';
import {onRequestGet as session} from '../../functions/api/v1/auth/session.ts';
import {onRequestPost as logout} from '../../functions/api/v1/auth/logout.ts';

const appOrigin='http://127.0.0.1:55325';
const host='127.0.0.1';
const port=55325;
const mappings=new Map([
 ['/api/v1/auth/login',login],
 ['/api/v1/auth/session',session],
 ['/api/v1/auth/logout',logout]
]);
function check(ok,message) {
 if(!ok)throw new Error('LOCAL_BFF_QA_'+message);
}
function localEnv(url,publishable,secret) {
 assertLocalQaUrl(url);
 return Object.freeze({
  APP_ENV:'local',EXPECTED_SUPABASE_PROJECT_REF:'LOCAL_QA_ONLY',
  APP_ORIGIN:appOrigin,SUPABASE_URL:url,
  SUPABASE_PUBLISHABLE_KEY:publishable,SUPABASE_SECRET_KEY:secret,
  SESSION_ENCRYPTION_KEY:base64url(randomBytes(32)),
  SESSION_KEY_VERSION:'1'
 });
}
function serveHandlers(env) {
 return createServer(async(req,res)=>{
  try {
   const target=new URL(req.url??'/',appOrigin);
   const fn=mappings.get(target.pathname);
   if(!fn){res.writeHead(404);res.end();return;}
   const body=req.method==='POST'?req:undefined;
   const request=new Request(target,{method:req.method,headers:req.headers,body,
     ...(body?{duplex:'half'}:{})});
   const output=await fn({request,env});
   res.statusCode=output.status;
   for(const [name,value] of output.headers)res.setHeader(name,value);
   res.end(Buffer.from(await output.arrayBuffer()));
  }catch{
   res.writeHead(500,{'Cache-Control':'no-store'});res.end();
  }
 });
}
async function call(path,options={}) {
 const {method='GET',cookie,csrf,origin=appOrigin,payload}=options;
 const headers={};
 if(cookie)headers.Cookie=cookie;
 if(csrf)headers['X-CSRF-Token']=csrf;
 if(method==='POST') {
  headers.Origin=origin;
  headers['Content-Type']='application/json';
 }
 const response=await fetch(appOrigin+path,{method,headers,
   ...(method==='POST'?{body:JSON.stringify(payload??{})}:{})});
 let json;
 try{json=await response.json()}catch{json=null}
 return {status:response.status,json,cookie:response.headers.get('set-cookie')};
}
function cookieFrom(response) {
 check(response.status===200,'LOGIN_STATUS');
 const header=response.cookie;
 check(typeof header==='string'&&header.startsWith('__Host-pg_session='),'LOGIN_COOKIE');
 return header.split(';')[0];
}
function csrfFrom(response) {
 const token=response.json?.data?.csrf;
 check(typeof token==='string'&&token.length>30,'CSRF_TOKEN_MISSING');
 return token;
}
async function setExpiringSession(admin,cookie,sessionKey) {
 const handle=cookie.split('=')[1];
 const hash=await digestHandle(handle);
 const {data,error}=await admin.rpc('pg_auth_session_get',{p_handle_hash:hash});
 check(!error&&data?.encrypted_tokens,'SESSION_READ_FOR_REFRESH');
 const tokens=await decryptTokens(sessionKey,data.auth_user_id,data.encrypted_tokens);
 tokens.expiresAt=Math.floor(Date.now()/1000)+1;
 const encrypted=await encryptTokens(sessionKey,data.auth_user_id,tokens);
 const modified=await admin.rpc('pg_qa_replace_tokens',
  {p_hash:hash,p_encrypted:encrypted});
 check(!modified.error&&modified.data===true,'FORCE_NEAR_EXPIRY_FAILED');
 return hash;
}
async function main() {
 const url=assertLocalQaUrl(process.env.PG_QA_LOCAL_URL);
 const publishable=process.env.PG_QA_LOCAL_ANON_KEY;
 const secret=process.env.PG_QA_LOCAL_SERVICE_KEY;
 check(!!publishable&&!!secret,'LOCAL_KEYS_REQUIRED');
 const env=localEnv(url,publishable,secret);
 const admin=localClient(url,secret);
 const created=[];
 const web=serveHandlers(env);
 let serverStarted=false;
 try {
  web.listen(port,host);
  await once(web,'listening');
  serverStarted=true;
  check(web.address()?.address===host,'HTTP_BIND_NOT_LOOPBACK');
  // Fixtures are disposable and exist ONLY in a newly created local
  // Supabase Docker project with the QA-only RPC migration.
  const users=[];
  for(const label of ['qa_teacher_a','qa_teacher_b']) {
   const email=technicalAuthAlias(randomUUID());
   const password=newTemporaryPassword();
   const createdUser=await admin.auth.admin.createUser({email,password,
    email_confirm:true,app_metadata:{managed_by:'portalgenius',
      identity_kind:'technical_email_no_delivery'}});
   check(!createdUser.error&&!!createdUser.data.user?.id,'AUTH_FIXTURE_CREATION');
   const id=createdUser.data.user.id;
   created.push(id);
   const bound=await admin.rpc('pg_qa_bind_staff',
    {p_user_id:id,p_alias:email,p_username:label,p_role:'teacher'});
   check(!bound.error&&bound.data===true,'BIND_FIXTURE');
   users.push({id,username:label,password});
  }
  const loginA=await call('/api/v1/auth/login',{
   method:'POST',payload:{username:users[0].username,password:users[0].password}});
  const cookieA=cookieFrom(loginA),csrfA=csrfFrom(loginA);
  const readA=await call('/api/v1/auth/session',{cookie:cookieA});
  check(readA.status===200&&readA.json?.data?.profile?.id===users[0].id,
   'FIRST_SESSION_IDENTITY');
  console.log('PASS BFF login and session on isolated local HTTP');

  const loginB=await call('/api/v1/auth/login',{
   method:'POST',payload:{username:users[1].username,password:users[1].password}});
  const cookieB=cookieFrom(loginB);
  const [a,b]=await Promise.all([
   call('/api/v1/auth/session',{cookie:cookieA}),
   call('/api/v1/auth/session',{cookie:cookieB})
  ]);
  check(a.status===200&&b.status===200&&
   a.json?.data?.profile?.id===users[0].id&&b.json?.data?.profile?.id===users[1].id,
   'PARALLEL_CROSS_IDENTITY');
  console.log('PASS BFF simultaneous requests keep teacher A/B identities separate');

  const hostileLogout=await call('/api/v1/auth/logout',{
   method:'POST',cookie:cookieA,csrf:csrfA,
   origin:'https://outside.invalid'});
  check(hostileLogout.status===403,'HOSTILE_ORIGIN_NOT_DENIED');
  const stillValid=await call('/api/v1/auth/session',{cookie:cookieA});
  check(stillValid.status===200,'HOSTILE_ORIGIN_MODIFIED_SESSION');
  console.log('PASS BFF hostile Origin refused without revoking session');

  const logoutA=await call('/api/v1/auth/logout',{
   method:'POST',cookie:cookieA,csrf:csrfA});
  check(logoutA.status===200,'LOGOUT_FAILED');
  const replayA=await call('/api/v1/auth/session',{cookie:cookieA});
  check(replayA.status===401&&!replayA.json?.data?.profile,
   'REVOKED_COOKIE_REPLAY_ACCEPTED');
  const unaffectedB=await call('/api/v1/auth/session',{cookie:cookieB});
  check(unaffectedB.status===200&&unaffectedB.json?.data?.profile?.id===users[1].id,
   'OTHER_USER_SESSION_REVOKED');
  console.log('PASS BFF revoked cookie replay denied HTTP 401, teacher B unaffected');

  const again=await call('/api/v1/auth/login',{
   method:'POST',payload:{username:users[0].username,password:users[0].password}});
  const freshCookie=cookieFrom(again),freshCsrf=csrfFrom(again);
  const hash=await setExpiringSession(admin,freshCookie,env.SESSION_ENCRYPTION_KEY);
  const parallel=await Promise.all([
   call('/api/v1/auth/session',{cookie:freshCookie}),
   call('/api/v1/auth/session',{cookie:freshCookie})
  ]);
  check(parallel.every(p=>p.status===200&&p.json?.data?.profile?.id===users[0].id),
   'CONCURRENT_HTTP_REFRESH_FAILED');
  const rotated=await admin.rpc('pg_auth_session_get',{p_handle_hash:hash});
  check(!rotated.error&&rotated.data?.version===2,'LEASE_VERSION_NOT_ROTATED_ONCE');
  console.log('PASS BFF concurrent near-expiry HTTP refresh commits one lease/version');

  // Force a bounded busy lease, then logout and prove old handle cannot be replayed.
  await setExpiringSession(admin,freshCookie,env.SESSION_ENCRYPTION_KEY);
  const held=await admin.rpc('pg_qa_hold_lease',{p_hash:hash});
  check(!held.error&&held.data===true,'LEASE_HOLD_UNAVAILABLE');
  const started=Date.now();
  const busy=await call('/api/v1/auth/session',{cookie:freshCookie});
  const elapsed=Date.now()-started;
  check(busy.status===503&&elapsed<8000,'LEASE_BUSY_NOT_BOUNDED');
  const ended=await call('/api/v1/auth/logout',{
   method:'POST',cookie:freshCookie,csrf:freshCsrf});
  check(ended.status===200,'LOGOUT_AFTER_HELD_LEASE');
  const after=await call('/api/v1/auth/session',{cookie:freshCookie});
  check(after.status===401,'LEASE_REVOKE_RACE_REPLAY');
  console.log('PASS BFF lease busy bounded and logout replay HTTP 401');
  console.log('LOCAL_BFF_SESSION_QA_PASS: 5 gates; localhost only; no hosted project accessed');
 }finally{
  if(serverStarted)await new Promise(done=>web.close(done));
  else web.close();
  let failed=false;
  for(const id of created.reverse()) {
   const unbound=await admin.rpc('pg_qa_unbind_staff',{p_user_id:id});
   if(unbound.error||unbound.data!==true)failed=true;
   const deleted=await admin.auth.admin.deleteUser(id);
   if(deleted.error)failed=true;
  }
  if(failed)throw new Error('LOCAL_BFF_QA_CLEANUP_FAILED');
  console.log('LOCAL_BFF_SESSION_QA_CLEANUP_PASS: synthetic users removed');
 }
}
main().catch(e=>{
 const message=e instanceof Error?e.message:'UNKNOWN';
 console.error(/^LOCAL_BFF_QA_/.test(message)?message:'LOCAL_BFF_QA_BLOCKED');
 process.exitCode=1;
});
