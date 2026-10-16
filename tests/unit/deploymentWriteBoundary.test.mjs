import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isTrustedMutation} from '../../server/platform/requestGuard.ts';
import {verifyEnv} from '../../server/platform/env.ts';

const productionOrigin='https://portalgenius.pages.dev';
const previewOrigin='https://branch.portalgenius.pages.dev';
const realRef='vpglikrkvsnoyjvluigs';
const production={
 APP_ENV:'production',APP_ORIGIN:productionOrigin,
 SUPABASE_URL:'https://'+realRef+'.supabase.co',
 EXPECTED_SUPABASE_PROJECT_REF:realRef,
 SUPABASE_PUBLISHABLE_KEY:'synthetic-public',
 SUPABASE_SECRET_KEY:'synthetic-private',
 SESSION_ENCRYPTION_KEY:'synthetic-session-key',
 SESSION_KEY_VERSION:'1'
};
function mutation(target,headers={}){
 return new Request(target+'/api/v1/terms',{method:'POST',
  headers:{Origin:productionOrigin,...headers}});
}
test('real production mutations require exact configured target and origin',()=>{
 assert.equal(isTrustedMutation(mutation(productionOrigin),productionOrigin),true);
 assert.equal(isTrustedMutation(mutation(previewOrigin),productionOrigin),false);
 assert.equal(isTrustedMutation(mutation('https://evil.example'),productionOrigin),false);
 assert.equal(isTrustedMutation(mutation(productionOrigin,{Origin:'https://evil.example'}),productionOrigin),false);
});
test('forged Origin and Referer cannot authorize Preview requests to Production',()=>{
 const forged=new Request(previewOrigin+'/api/v1/terms',{
  method:'POST',headers:{Origin:productionOrigin,Referer:productionOrigin+'/app'}
 });
 assert.equal(isTrustedMutation(forged,productionOrigin),false);
 const fallback=new Request(previewOrigin+'/api/v1/terms',{
  method:'POST',headers:{Referer:productionOrigin+'/app'}
 });
 assert.equal(isTrustedMutation(fallback,productionOrigin),false);
});
test('referer fallback is accepted only for the correctly targeted application',()=>{
 const prod=new Request(productionOrigin+'/api/v1/terms',{
  method:'POST',headers:{Referer:productionOrigin+'/dashboard'}
 });
 assert.equal(isTrustedMutation(prod,productionOrigin),true);
 const withoutHeaders=new Request(productionOrigin+'/api/v1/terms',{method:'POST'});
 assert.equal(isTrustedMutation(withoutHeaders,productionOrigin),false);
});
test('staging Preview cannot use the existing production project for any BFF data access',()=>{
 assert.equal(verifyEnv(production).APP_ENV,'production');
 for(const origin of [productionOrigin,previewOrigin,'https://another-preview.pages.dev']){
  assert.throws(()=>verifyEnv({...production,APP_ENV:'staging',APP_ORIGIN:origin}),
   /CONFIG_(STAGING_PRODUCTION_BINDING_BLOCKED|PRODUCTION_ENV_MISMATCH)/);
 }
});
test('staging Preview may use a genuinely distinct project but cannot silently inherit live identity',()=>{
 const qaRef='abcdefghijklmnopqrst';
 const qa={...production,APP_ENV:'staging',APP_ORIGIN:previewOrigin,
  EXPECTED_SUPABASE_PROJECT_REF:qaRef,
  SUPABASE_URL:'https://'+qaRef+'.supabase.co'};
 assert.equal(verifyEnv(qa).EXPECTED_SUPABASE_PROJECT_REF,qaRef);
 assert.throws(()=>verifyEnv({...qa,EXPECTED_SUPABASE_PROJECT_REF:realRef}),
  /CONFIG_PROJECT_REF_MISMATCH/);
});
