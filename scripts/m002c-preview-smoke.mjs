// M-002C Cloudflare Preview boundary checks: no credentials, no cookies, no mutations.
// Preview hostname is copied from Cloudflare's PR #5 deployment comment.
const origin='https://feat-m002c-identity-students.portalgenius.pages.dev';
const checks=[
 {name:'HTML application',path:'/',status:200,validate:async r=>(await r.text()).includes('PortalGenius')},
 {name:'health',path:'/api/v1/health',status:200,validate:async r=>(await r.json()).data?.status==='ok'},
 ...['students','teachers','accounts','assignments'].map(item=>({
  name:item+' must deny anonymous',path:'/api/v1/'+item,status:401,
  validate:async r=>(await r.json()).error?.code==='NOT_AUTHENTICATED'
 })),
 {name:'legacy academic-years still deny anonymous',path:'/api/v1/academic-years',status:401,
  validate:async r=>(await r.json()).error?.code==='NOT_AUTHENTICATED'}
];
let passed=0;
for(const check of checks) {
 let ok=false,status='unavailable';
 for(let attempt=0;attempt<4&&!ok;attempt++) {
  try {
   const result=await fetch(origin+check.path,{
    headers:{'Cache-Control':'no-cache'},redirect:'manual',signal:AbortSignal.timeout(10000)
   });
   status=result.status;ok=result.status===check.status&&await check.validate(result);
  }catch{ok=false;}
  if(!ok&&attempt<3)await new Promise(resolve=>setTimeout(resolve,5000));
 }
 console.log(`${ok?'PASS':'BLOCKED'} M002C preview ${check.name} HTTP ${status} expected ${check.status}`);
 if(ok)passed++;
}
console.log(`M002C_PREVIEW_RESULT ${passed}/${checks.length}`);
if(passed!==checks.length)process.exitCode=1;
