import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseProductionBinding,runProductionReadOnlyPreflight} from '../../scripts/qa/productionReadOnlyPreflight.mjs';

const productionOrigin='https://portalgenius.pages.dev';
const productionRef='vpglikrkvsnoyjvluigs';
const supabaseUrl='https://'+productionRef+'.supabase.co';
const publishableKey='sb_publishable_synthetic_example';
const config={appOrigin:productionOrigin,supabaseUrl,projectRef:productionRef,
 publicKey:publishableKey};
const fixture='[vars]\nAPP_ENV = "production"\nAPP_ORIGIN = "'+
 productionOrigin+'"\nSUPABASE_URL = "'+supabaseUrl+
 '"\nEXPECTED_SUPABASE_PROJECT_REF = "'+productionRef+
 '"\nSUPABASE_PUBLISHABLE_KEY = "'+publishableKey+'"\n';

test('production preflight parses only exact known project and published key',()=>{
 assert.deepEqual(parseProductionBinding(fixture),config);
 assert.equal(parseProductionBinding(readFileSync('wrangler.toml','utf8')).projectRef,productionRef);
});
test('production preflight cannot be tricked by staging, Preview, another project or flags',()=>{
 const cases=[
  fixture.replace('APP_ENV = "production"','APP_ENV = "staging"'),
  fixture.replace(productionOrigin,'https://preview.portalgenius.pages.dev'),
  fixture.replaceAll(productionRef,'abcdefghijklmnopqrst'),
  fixture.replace(publishableKey,'sb_secret_do_not_send'),
  fixture+'ACCOUNT_PROVISIONING_ENABLED = "enabled"\n',
  fixture+'ACCOUNT_PROVISIONING_RELEASE = "reviewed-v1"\n',
  fixture+'APP_ORIGIN = "'+productionOrigin+'"\n',
  fixture.replace('[vars]','[some_other_section]')
 ];
 for(const candidate of cases)assert.throws(()=>parseProductionBinding(candidate),
  /PRODUCTION_CONFIG_BLOCKED/);
});
test('wrong production target is rejected before any network I/O',async()=>{
 let calls=0;
 const fake=async()=>{calls++;throw Error('must not contact remote');};
 for(const wrong of [
  {...config,appOrigin:'https://preview.portalgenius.pages.dev'},
  {...config,supabaseUrl:'https://abcdefghijklmnopqrst.supabase.co'},
  {...config,projectRef:'abcdefghijklmnopqrst'},
  {...config,publicKey:'sb_secret_nope'},null
 ])await assert.rejects(runProductionReadOnlyPreflight(wrong,fake),
  /PRODUCTION_TARGET_BLOCKED/);
 assert.equal(calls,0);
});
test('preflight performs only two exact, non-redirected, no-store GET requests',async()=>{
 const calls=[];
 const fake=async(url,init)=>{
  calls.push({url,method:init.method,redirect:init.redirect,cache:init.headers['Cache-Control'],
   authHeader:init.headers.apikey??null});
  if(url===productionOrigin+'/api/v1/health')
   return new Response(JSON.stringify({data:{service:'PortalGenius API',status:'ok'}}),{status:200});
  if(url===supabaseUrl+'/auth/v1/settings')
   return new Response(JSON.stringify({disable_signup:true}),{status:200});
  throw Error('unexpected endpoint');
 };
 assert.deepEqual(await runProductionReadOnlyPreflight(config,fake),{
  apiReachable:true,publicSignupDisabled:true,scope:'READ_ONLY_PRODUCTION'
 });
 assert.deepEqual(calls,[
  {url:productionOrigin+'/api/v1/health',method:'GET',redirect:'manual',
   cache:'no-store',authHeader:null},
  {url:supabaseUrl+'/auth/v1/settings',method:'GET',redirect:'manual',
   cache:'no-store',authHeader:publishableKey}
 ]);
});
test('public signup enabled, invalid settings, API health errors and redirects block PASS',async()=>{
 const health=async(url)=>new Response(JSON.stringify(
  url.endsWith('/health')?{data:{service:'PortalGenius API',status:'ok'}}:
   {disable_signup:false}
 ),{status:200});
 await assert.rejects(runProductionReadOnlyPreflight(config,health),
  /PRODUCTION_PUBLIC_SIGNUP_NOT_DISABLED/);
 const badHealth=async()=>new Response(JSON.stringify({data:{status:'ok'}}),{status:200});
 await assert.rejects(runProductionReadOnlyPreflight(config,badHealth),
  /PRODUCTION_API_HEALTH_BLOCKED/);
 const redirect=async()=>new Response(null,{status:302,
  headers:{Location:'https://wrong.example.org'}});
 await assert.rejects(runProductionReadOnlyPreflight(config,redirect),
  /PRODUCTION_API_HEALTH_BLOCKED/);
 const noSettings=async(url)=>url.endsWith('/health')?
  new Response(JSON.stringify({data:{service:'PortalGenius API',status:'ok'}})):
  new Response('{}',{status:200});
 await assert.rejects(runProductionReadOnlyPreflight(config,noSettings),
  /PRODUCTION_PUBLIC_SIGNUP_NOT_DISABLED/);
});
