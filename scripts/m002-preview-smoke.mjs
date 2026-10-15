// Anonymous, non-mutating preview smoke: never uses admin credentials or cookies.
// This branch alias comes from the Cloudflare bot on PR #3.
const origin='https://feat-m002-security-master-fo.portalgenius.pages.dev';
const probes=[
  {name:'html frontend',path:'/',status:200,verify:async r=>(await r.text()).includes('PortalGenius')},
  {name:'API health',path:'/api/v1/health',status:200,verify:async r=>(await r.json()).data?.status==='ok'},
  {name:'academic years anonymous denied',path:'/api/v1/academic-years',status:401,
    verify:async r=>(await r.json()).error?.code==='NOT_AUTHENTICATED'},
  {name:'unknown API route denied',path:'/api/v1/nonexistent-qa-route',status:404,
    verify:async r=>(await r.json()).error?.code==='NOT_FOUND'}
];
let passed=0;
for(const probe of probes){
  let ok=false,status=null;
  // Cloudflare deployment and GitHub workflow may finish in either order.
  for(let attempt=0;attempt<8&&!ok;attempt++){
    try{
      const response=await fetch(origin+probe.path,{
        method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000),
        headers:{'Cache-Control':'no-cache'}
      });
      status=response.status;
      ok=status===probe.status && await probe.verify(response);
    }catch{ok=false;}
    if(!ok&&attempt<7)await new Promise(resolve=>setTimeout(resolve,7000));
  }
  console.log(`${ok?'PASS':'BLOCKED'} M002A preview ${probe.name}: HTTP ${status??'unavailable'}`);
  if(ok)passed++;
}
console.log(`M002A_PREVIEW_RESULT ${passed}/${probes.length}`);
if(passed!==probes.length)process.exitCode=1;
