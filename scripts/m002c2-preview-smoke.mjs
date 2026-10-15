// Read-only and rejection probes only. This test NEVER enables provisioning.
const origin='https://feat-m002c2-account-provisio.portalgenius.pages.dev';
const checks=[
 {name:'portal frontend',path:'/',status:200,
  ok:async r=>(await r.text()).includes('PortalGenius')},
 {name:'health',path:'/api/v1/health',status:200,
  ok:async r=>(await r.json()).data?.status==='ok'},
 {name:'accounts list anonymous denied',path:'/api/v1/accounts',status:401,
  ok:async r=>(await r.json()).error?.code==='NOT_AUTHENTICATED'},
 {name:'provision hostile Origin denied',path:'/api/v1/accounts/create',status:403,
  method:'POST',headers:{Origin:'https://attacker.invalid','Content-Type':'application/json'},
  body:'{}',ok:async r=>(await r.json()).error?.code==='ORIGIN_DENIED'},
 {name:'provision no-cookie denied',path:'/api/v1/accounts/create',status:401,
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  body:'{}',ok:async r=>(await r.json()).error?.code==='NOT_AUTHENTICATED'}
];
let pass=0;
for(const item of checks){
 let status='unavailable',valid=false;
 for(let i=0;i<5&&!valid;i++){
  try{
   const r=await fetch(origin+item.path,{
    method:item.method??'GET',redirect:'manual',
    headers:{'Cache-Control':'no-cache',...item.headers},
    body:item.body,signal:AbortSignal.timeout(10000)
   });
   status=r.status;
   valid=r.status===item.status&&await item.ok(r);
  }catch{valid=false;}
  if(!valid&&i<4)await new Promise(done=>setTimeout(done,5000));
 }
 console.log((valid?'PASS':'BLOCKED')+' M002C2 preview '+item.name+
  ': HTTP '+status+' expected '+item.status);
 if(valid)pass++;
}
console.log('M002C2_PREVIEW_RESULT '+pass+'/'+checks.length);
if(pass!==checks.length)process.exitCode=1;
