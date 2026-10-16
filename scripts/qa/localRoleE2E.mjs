import {createServer} from 'node:http';
import {once} from 'node:events';
import {randomBytes,randomUUID} from 'node:crypto';
import {assertLocalQaUrl,localClient} from './localAuthProbe.mjs';
import {technicalAuthAlias} from '../../server/accounts/technicalAuthAlias.ts';
import {newTemporaryPassword} from '../../server/accounts/newTemporaryPassword.ts';
import {base64url} from '../../server/platform/crypto.ts';
import {onRequestPost as login} from '../../functions/api/v1/auth/login.ts';
import {onRequestGet as students} from '../../functions/api/v1/students.ts';
import {onRequestGet as accounts} from '../../functions/api/v1/accounts.ts';
import {onRequestGet as teachers} from '../../functions/api/v1/teachers.ts';
import {onRequestGet as assignments} from '../../functions/api/v1/assignments.ts';

const origin='http://127.0.0.1:55325';
const mapping=new Map([
 ['/api/v1/auth/login',login],
 ['/api/v1/students',students],
 ['/api/v1/accounts',accounts],
 ['/api/v1/teachers',teachers],
 ['/api/v1/assignments',assignments]
]);
function check(condition,code) {
 if(!condition)throw new Error('LOCAL_ROLE_QA_'+code);
}
function makeServer(env) {
 return createServer(async(req,res)=>{
  try {
   const target=new URL(req.url??'/',origin);
   const handler=mapping.get(target.pathname);
   if(!handler){res.writeHead(404);res.end();return;}
   const request=new Request(target,{
    method:req.method,headers:req.headers,
    ...(req.method==='POST'?{body:req,duplex:'half'}:{})
   });
   const reply=await handler({request,env});
   res.writeHead(reply.status,Object.fromEntries(reply.headers));
   res.end(Buffer.from(await reply.arrayBuffer()));
  }catch{
   res.writeHead(500,{'Cache-Control':'no-store'});res.end();
  }
 });
}
async function call(path,cookie=null,payload=null) {
 const method=payload===null?'GET':'POST';
 const headers=cookie?{Cookie:cookie}:{};
 if(method==='POST'){headers.Origin=origin;headers['Content-Type']='application/json';}
 const response=await fetch(origin+path,{
  method,headers,...(payload===null?{}:{body:JSON.stringify(payload)})
 });
 let data=null;
 try{data=await response.json()}catch{}
 return {status:response.status,data,cookie:response.headers.get('set-cookie')};
}
function exactIds(actual,expected,label) {
 check(Array.isArray(actual),'BAD_DATA_'+label);
 const seen=actual.map(x=>x.id).sort();
 const expectedSet=[...expected].sort();
 check(seen.length===new Set(seen).size,'DUPLICATE_'+label);
 check(JSON.stringify(seen)===JSON.stringify(expectedSet),'SCOPE_MISMATCH_'+label);
 for(const row of actual)
  check(JSON.stringify(Object.keys(row).sort())===
   JSON.stringify(['fullName','id','nis']), 'LEAKED_FIELDS_'+label);
}
async function account(admin,username,role,created) {
 const email=technicalAuthAlias(randomUUID());
 const password=newTemporaryPassword();
 const result=await admin.auth.admin.createUser({
  email,password,email_confirm:true,
  app_metadata:{managed_by:'portalgenius',identity_kind:'technical_email_no_delivery'}
 });
 check(!result.error&&!!result.data.user?.id,'AUTH_CREATE_FAILED');
 const id=result.data.user.id;
 const item={id,username,role,password,bound:false};
 created.push(item);
 const bound=await admin.rpc('pg_qa_bind_staff',{
  p_user_id:id,p_username:username,p_alias:email,p_role:role
 });
 check(!bound.error&&bound.data===true,'ACCOUNT_BIND_FAILED');
 item.bound=true;
 return item;
}
async function main() {
 const url=assertLocalQaUrl(process.env.PG_QA_LOCAL_URL);
 const publishable=process.env.PG_QA_LOCAL_ANON_KEY;
 const secret=process.env.PG_QA_LOCAL_SERVICE_KEY;
 check(!!publishable&&!!secret,'LOCAL_KEYS_MISSING');
 const admin=localClient(url,secret);
 const env={
  APP_ENV:'local',EXPECTED_SUPABASE_PROJECT_REF:'LOCAL_QA_ONLY',
  APP_ORIGIN:origin,SUPABASE_URL:url,
  SUPABASE_PUBLISHABLE_KEY:publishable,SUPABASE_SECRET_KEY:secret,
  SESSION_ENCRYPTION_KEY:base64url(randomBytes(32)),
  SESSION_KEY_VERSION:'1'
 };
 const web=makeServer(env);
 const created=[];
 let started=false;
 let success=false;
 try{
  web.listen(55325,'127.0.0.1');
  await once(web,'listening');
  started=true;
  check(web.address()?.address==='127.0.0.1','SERVER_NOT_LOOPBACK');
  const principals={};
  for(const [name,role] of [
   ['qa_admin','admin'],['qa_teacher_a','teacher'],['qa_teacher_b','teacher'],
   ['qa_counselor_a','counselor'],['qa_counselor_b','counselor'],
   ['qa_principal','principal']
  ])principals[name]=await account(admin,name,role,created);
  const seed=await admin.rpc('pg_qa_seed_role_scopes',{
   p_teacher_a:principals.qa_teacher_a.id,
   p_teacher_b:principals.qa_teacher_b.id,
   p_counselor_a:principals.qa_counselor_a.id,
   p_counselor_b:principals.qa_counselor_b.id
  });
  check(!seed.error&&!!seed.data?.s1&&!!seed.data?.s7,'SEED_FAILED');
  const fixture=seed.data;
  console.log('PASS local role QA created synthetic staff and assigned students');
  for(const user of Object.values(principals)){
   const response=await call('/api/v1/auth/login',null,{
    username:user.username,password:user.password
   });
   check(response.status===200&&response.data?.data?.profile?.id===user.id,
    'AUTH_LOGIN_'+user.role);
   check(response.cookie?.startsWith('__Host-pg_session='),
    'AUTH_COOKIE_'+user.role);
   user.cookie=response.cookie.split(';')[0];
  }
  console.log('PASS role-specific staff login through real PortalGenius BFF');

  const matrix=[
   ['qa_admin',[fixture.s1,fixture.s2,fixture.s3,fixture.s4,fixture.s5,fixture.s7]],
   ['qa_teacher_a',[fixture.s1,fixture.s2]],
   ['qa_teacher_b',[fixture.s3]],
   ['qa_counselor_a',[fixture.s1]],
   ['qa_counselor_b',[fixture.s4]]
  ];
  for(const [name,allowed] of matrix){
   const response=await call('/api/v1/students',principals[name].cookie);
   check(response.status===200,'STUDENTS_STATUS_'+name);
   exactIds(response.data?.data,allowed,name);
  }
  const principal=await call('/api/v1/students',principals.qa_principal.cookie);
  check(principal.status===403&&!principal.data?.data,
   'PRINCIPAL_STUDENTS_NOT_DENIED');
  console.log('PASS teacher A/B and counselor A/B see only assigned active students');
  console.log('PASS principal-only student list denied; archived and expired rows excluded');

  const spoof=await call(
   '/api/v1/students?actorId='+principals.qa_admin.id+'&role=admin',
   principals.qa_teacher_a.cookie
  );
  check(spoof.status===200,'ACTOR_SPOOF_STATUS');
  exactIds(spoof.data?.data,[fixture.s1,fixture.s2],'ACTOR_SPOOF');
  console.log('PASS actor ID/role query spoof cannot widen student projection');

  for(const [path,expectedCount] of [
   ['/api/v1/accounts',6],['/api/v1/teachers',2],
   ['/api/v1/assignments',3]
  ]){
   const adminResponse=await call(path,principals.qa_admin.cookie);
   check(adminResponse.status===200&&
    Array.isArray(adminResponse.data?.data)&&
    adminResponse.data.data.length===expectedCount,
    'ADMIN_MASTER_'+path.split('/').at(-1));
   if(path.endsWith('/accounts')){
    check(adminResponse.data.data.every(row=>
     !Object.prototype.hasOwnProperty.call(row,'authAlias')&&
     !Object.prototype.hasOwnProperty.call(row,'authEmail')),
     'ACCOUNT_ALIAS_LEAK');
   }
   for(const other of Object.values(principals).filter(x=>x.role!=='admin')){
    const result=await call(path,other.cookie);
    check(result.status===403&&!result.data?.data,
     'NONADMIN_MASTER_'+other.username+'_'+path.split('/').at(-1));
   }
  }
  console.log('PASS only admin may list accounts, teachers and assignments');

  const anon=await call('/api/v1/students');
  check(anon.status===401,'ANON_STUDENTS_NOT_DENIED');
  const low=localClient(url,publishable);
  const auth=await low.auth.signInWithPassword({
   email:technicalAuthAlias('00000000-0000-4000-8000-000000000001'),
   password:newTemporaryPassword()
  });
  // The fake identity cannot authenticate, and the database API never gets
  // service-role power even when caller can reach it with a publishable key.
  check(!!auth.error,'SYNTHETIC_FAKE_AUTH_ACCEPTED');
  const direct=await low.from('students').select('id');
  check(!!direct.error,'ANON_DIRECT_STUDENTS_ALLOWED');
  console.log('PASS anonymous HTTP and direct database table access denied');
  success=true;
 }finally{
  if(started)await new Promise(resolve=>web.close(resolve));
  else web.close();
  let cleanupFailed=false;
  const cleared=await admin.rpc('pg_qa_clear_role_scopes');
  if(cleared.error||cleared.data!==true)cleanupFailed=true;
  for(const user of created.reverse()){
   if(user.bound){
    const unbound=await admin.rpc('pg_qa_unbind_staff',{p_user_id:user.id});
    if(unbound.error||unbound.data!==true)cleanupFailed=true;
   }
   const deleted=await admin.auth.admin.deleteUser(user.id);
   if(deleted.error)cleanupFailed=true;
  }
  if(cleanupFailed)throw new Error('LOCAL_ROLE_QA_CLEANUP_FAILED');
  console.log('LOCAL_ROLE_QA_CLEANUP_PASS: synthetic students, staff and roles removed');
 }
 check(success,'INCOMPLETE');
 console.log('LOCAL_ROLE_E2E_QA_PASS: 7 gates; localhost only; no hosted project accessed');
}
main().catch(e=>{
 const code=e instanceof Error?e.message:'UNKNOWN';
 console.error(code.startsWith('LOCAL_ROLE_QA_')?code:'LOCAL_ROLE_QA_BLOCKED');
 process.exitCode=1;
});
