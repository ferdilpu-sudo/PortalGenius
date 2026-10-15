// Synthetic read-only/invalid-request probes. Never use real credentials or cookies.
// Branch preview URL is published by the Cloudflare bot on PR #4.
const origin='https://feat-m002b-semesters-catalog.portalgenius.pages.dev';
const paths=['terms','programs','subjects','classes'];
const checks=[
 {name:'homepage',path:'/',status:200,
  test:async r=>(await r.text()).includes('PortalGenius')},
 {name:'health',path:'/api/v1/health',status:200,
  test:async r=>(await r.json()).data?.status==='ok'},
 ...paths.map(item=>({
  name:item+' anonymous GET',
  path:'/api/v1/'+item,status:401,
  test:async r=>(await r.json()).error?.code==='NOT_AUTHENTICATED'
 })),
 ...paths.map(item=>({
  name:item+' foreign-origin POST',
  path:'/api/v1/'+item,status:403,
  init:{method:'POST',headers:{Origin:'https://attacker.invalid','Content-Type':'application/json'},body:'{}'},
  test:async r=>(await r.json()).error?.code==='ORIGIN_DENIED'
 })),
 ...paths.map(item=>({
  name:item+' no-cookie POST',
  path:'/api/v1/'+item,status:401,
  init:{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'},
  test:async r=>(await r.json()).error?.code==='NOT_AUTHENTICATED'
 }))
];
let passed=0;
for(const check of checks){
 let status='unavailable',ok=false;
 for(let attempt=0;attempt<2&&!ok;attempt++){
  try{
   const response=await fetch(origin+check.path,{redirect:'manual',
    signal:AbortSignal.timeout(10000),
    headers:{'Cache-Control':'no-cache',...check.init?.headers},
    method:check.init?.method??'GET',body:check.init?.body});
   status=response.status;
   ok=response.status===check.status&&await check.test(response);
  }catch{ok=false;}
  if(!ok&&attempt<1)await new Promise(resolve=>setTimeout(resolve,5000));
 }
 console.log((ok?'PASS':'BLOCKED')+' M002B preview '+check.name+
  ': HTTP '+status+' expected '+check.status);
 if(ok)passed++;
}
console.log('M002B_PREVIEW_CHECKS '+passed+'/'+checks.length);
if(passed!==checks.length)process.exitCode=1;
