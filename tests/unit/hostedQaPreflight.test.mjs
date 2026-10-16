import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hostedQaIdentity,PRODUCTION_PAGES_ORIGIN,PRODUCTION_SUPABASE_REF,
 HOSTED_QA_PATH} from '../../server/platform/hostedQaBoundary.ts';
import {onRequestGet} from '../../functions/api/v1/qa/environment.ts';
import {runHostedQaPreflight} from '../../scripts/qa/hostedQaPreflight.mjs';

const ref='abcdefghijklmnopqrst';
const pages='https://qa-preview.portalgenius.pages.dev';
const supabase='https://'+ref+'.supabase.co';
const cfg={APP_ENV:'staging',APP_ORIGIN:pages,
 SUPABASE_URL:supabase,EXPECTED_SUPABASE_PROJECT_REF:ref};
const probe=pages+HOSTED_QA_PATH;
const key='sb_publishable_synthetic_test_only';

test('production identifiers in hosted guard match tracked production bindings',()=>{
 const body=readFileSync('wrangler.toml','utf8');
 assert.ok(body.includes('APP_ORIGIN = "'+PRODUCTION_PAGES_ORIGIN+'"'));
 assert.ok(body.includes('EXPECTED_SUPABASE_PROJECT_REF = "'+PRODUCTION_SUPABASE_REF+'"'));
});
test('readiness endpoint is strictly read-only and refuses current production settings',async()=>{
 assert.deepEqual(hostedQaIdentity(cfg,probe),{appOrigin:pages,projectRef:ref});
 const valid=await onRequestGet({request:new Request(probe),env:cfg});
 assert.equal(valid.status,200);
 assert.deepEqual((await valid.json()).data,{appOrigin:pages,projectRef:ref});
 assert.equal(valid.headers.get('cache-control'),'no-store');
 const currentProduction={...cfg,APP_ORIGIN:PRODUCTION_PAGES_ORIGIN,
  EXPECTED_SUPABASE_PROJECT_REF:PRODUCTION_SUPABASE_REF,
  SUPABASE_URL:'https://'+PRODUCTION_SUPABASE_REF+'.supabase.co'};
 const blocked=await onRequestGet({
  request:new Request(PRODUCTION_PAGES_ORIGIN+HOSTED_QA_PATH),
  env:currentProduction
 });
 assert.equal(blocked.status,404);
});
test('hosted guard fails closed for production ref, origin spoof, invalid project or URL',()=>{
 const cases=[
  {...cfg,EXPECTED_SUPABASE_PROJECT_REF:PRODUCTION_SUPABASE_REF,
   SUPABASE_URL:'https://'+PRODUCTION_SUPABASE_REF+'.supabase.co'},
  {...cfg,APP_ORIGIN:PRODUCTION_PAGES_ORIGIN},
  {...cfg,APP_ENV:'production'},
  {...cfg,SUPABASE_URL:'https://'+PRODUCTION_SUPABASE_REF+'.supabase.co'},
  {...cfg,APP_ORIGIN:'https://qa-preview.portalgenius.pages.dev.evil.test'},
  {...cfg,APP_ORIGIN:'http://qa-preview.portalgenius.pages.dev'},
  {...cfg,APP_ORIGIN:pages+'/extra'},
  {...cfg,APP_ORIGIN:pages+'?x=1'},
  {...cfg,SUPABASE_URL:'https://'+ref+'.supabase.co.evil.test'},
  {...cfg,SUPABASE_URL:'http://'+ref+'.supabase.co'},
  {...cfg,EXPECTED_SUPABASE_PROJECT_REF:'not_a_supabase_ref'}
 ];
 for(const candidate of cases)assert.equal(hostedQaIdentity(candidate,probe),null);
 for(const maliciousRequest of [
  PRODUCTION_PAGES_ORIGIN+HOSTED_QA_PATH,
  pages+HOSTED_QA_PATH+'?redirect=evil',
  pages+'/api/v1/health',
  'http://qa-preview.portalgenius.pages.dev'+HOSTED_QA_PATH
 ])assert.equal(hostedQaIdentity(cfg,maliciousRequest),null);
});
test('preflight blocks invalid target before any network request',async()=>{
 let requests=0;
 const fakeFetch=async()=>{requests++;throw Error('must not call network');};
 for(const input of [
  {pagesOrigin:PRODUCTION_PAGES_ORIGIN,supabaseRef:ref,publishableKey:key},
  {pagesOrigin:pages,supabaseRef:PRODUCTION_SUPABASE_REF,publishableKey:key},
  {pagesOrigin:'https://attacker.example',supabaseRef:ref,publishableKey:key},
  {pagesOrigin:pages,supabaseRef:ref,publishableKey:'service_role_secret'},
  {pagesOrigin:pages,supabaseRef:undefined,publishableKey:key}
 ])await assert.rejects(runHostedQaPreflight(input,fakeFetch),/HOSTED_QA_TARGET_BLOCKED/);
 assert.equal(requests,0);
});
test('preflight checks actual Pages binding and Auth public signup settings via GET only',async()=>{
 const calls=[];
 const fakeFetch=async(url,options)=>{
  calls.push({url,method:options.method,redirect:options.redirect});
  if(url===probe)return new Response(JSON.stringify({data:{appOrigin:pages,projectRef:ref}}),{status:200});
  if(url===supabase+'/auth/v1/settings')
   return new Response(JSON.stringify({disable_signup:true}),{status:200});
  throw Error('unexpected URL');
 };
 const result=await runHostedQaPreflight({pagesOrigin:pages,supabaseRef:ref,publishableKey:key},fakeFetch);
 assert.deepEqual(result,{isolatedBinding:true,signupDisabled:true,scope:'READ_ONLY_PRECHECK'});
 assert.deepEqual(calls,[
  {url:probe,method:'GET',redirect:'manual'},
  {url:supabase+'/auth/v1/settings',method:'GET',redirect:'manual'}
 ]);
});
test('preflight does not PASS if Pages binding mismatches or Auth signup enabled',async()=>{
 const input={pagesOrigin:pages,supabaseRef:ref,publishableKey:key};
 let calls=0;
 const wrongPages=async()=>{
  calls++;
  return new Response(JSON.stringify({data:{appOrigin:pages,projectRef:PRODUCTION_SUPABASE_REF}}));
 };
 await assert.rejects(runHostedQaPreflight(input,wrongPages),/HOSTED_QA_PAGES_BINDING_BLOCKED/);
 assert.equal(calls,1);
 const signupEnabled=async(url)=>new Response(JSON.stringify(
  url===probe?{data:{appOrigin:pages,projectRef:ref}}:{disable_signup:false}
 ));
 await assert.rejects(runHostedQaPreflight(input,signupEnabled),/HOSTED_QA_SIGNUP_NOT_DISABLED/);
});
