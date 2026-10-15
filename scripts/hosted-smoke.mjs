// Non-mutating smoke test except bounded, generic invalid-login rate-limit counters.
// Node.js 22+: node scripts/hosted-smoke.mjs https://YOUR-STAGING.pages.dev
import { randomBytes } from 'node:crypto';
const origin=process.argv[2]?.replace(/\/$/,'');
if (!origin || !/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(origin) || origin.includes('@')) {
  console.error('Usage: node scripts/hosted-smoke.mjs https://YOUR-STAGING.pages.dev');
  process.exit(2);
}
let blocked=false;
function report(name,ok,detail='') {
  console.log(`${ok?'PASS':'BLOCKED'} hosted ${name}${detail?' '+detail:''}`);
  if(!ok)blocked=true;
}
async function probe(name,path,options,expected,checker=()=>true) {
  try {
    const r=await fetch(origin+path,{...options,redirect:'manual',signal:AbortSignal.timeout(12000)});
    let body=null;
    try{body=await r.json();}catch{ /* HTML can be checked separately */ }
    report(name,r.status===expected&&checker(body),`HTTP ${r.status}, expected ${expected}`);
  }catch{report(name,false,'unavailable or timeout');}
}
await probe('API health','/api/v1/health',{method:'GET'},200,b=>b?.data?.status==='ok');
await probe('anonymous session forbidden','/api/v1/auth/session',{method:'GET'},401,b=>b?.error?.code==='NOT_AUTHENTICATED');
await probe('foreign origin rejected','/api/v1/auth/login',{
  method:'POST',headers:{Origin:'https://untrusted.invalid','Content-Type':'application/json'},
  body:JSON.stringify({username:'qa-nobody',password:'this-is-not-a-real-password'})
},403,b=>b?.error?.code==='ORIGIN_DENIED');
await probe('unknown username rejected generically','/api/v1/auth/login',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({username:'qa'+randomBytes(6).toString('hex'),password:'this-is-not-a-real-password'})
},401,b=>b?.error?.code==='INVALID_CREDENTIALS');
await probe('foreign origin logout rejected','/api/v1/auth/logout',{
  method:'POST',headers:{Origin:'https://untrusted.invalid'}
},403,b=>b?.error?.code==='ORIGIN_DENIED');
await probe('anonymous password change denied','/api/v1/auth/password',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({currentPassword:'synthetic-old-password',newPassword:'synthetic-new-password'})
},401,b=>b?.error?.code==='NOT_AUTHENTICATED');
await probe('unknown session cookie rejected','/api/v1/auth/session',{
  method:'GET',headers:{Cookie:'__Host-pg_session='+ 'x'.repeat(43)}
},401,b=>b?.error?.code==='NOT_AUTHENTICATED');
if(blocked)process.exitCode=1;
