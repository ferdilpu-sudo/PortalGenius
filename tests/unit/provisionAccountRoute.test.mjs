import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../../functions/api/v1/accounts/create.ts';
import {isProvisioningEnabled,isStaffPasswordResetEnabled} from '../../server/accounts/provisioningGate.ts';
test('Preview never gains access to the production database through a staging flag',()=>{
 const preview={APP_ENV:'staging',APP_ORIGIN:'https://test-m002c2.portalgenius.pages.dev',
  EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs',
  SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co'};
 for(const flags of [
  {},{ACCOUNT_PROVISIONING_ENABLED:'enabled'},
  {ACCOUNT_PROVISIONING_ENABLED:'enabled',ACCOUNT_PROVISIONING_RELEASE:'reviewed-v1'}
 ]){
  assert.equal(isProvisioningEnabled({...preview,...flags}),false);
  assert.equal(isStaffPasswordResetEnabled({...preview,...flags}),false);
 }
 assert.equal(isProvisioningEnabled({...preview,APP_ENV:'production',
  ACCOUNT_PROVISIONING_ENABLED:'enabled',ACCOUNT_PROVISIONING_RELEASE:'reviewed-v1'}),false);
});
test('unrelated staging refs and lookalike Production domains stay locked',()=>{
 const flags={ACCOUNT_PROVISIONING_ENABLED:'enabled',ACCOUNT_PROVISIONING_RELEASE:'reviewed-v1'};
 for(const env of [
  {APP_ENV:'staging',APP_ORIGIN:'https://isolated-qa.pages.dev',
   EXPECTED_SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',
   SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'},
  {APP_ENV:'production',APP_ORIGIN:'https://portalgenius.pages.dev.evil.test',
   EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs',
   SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co'},
  {APP_ENV:'production',APP_ORIGIN:'https://portalgenius.pages.dev',
   EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs',
   SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co.evil.test'}
 ]){
  assert.equal(isProvisioningEnabled({...env,...flags}),false);
  assert.equal(isStaffPasswordResetEnabled({...env,...flags}),false);
 }
});
test('all password reset release flags remain hard-locked until recovery exists',()=>{
 const correct={APP_ENV:'production',APP_ORIGIN:'https://portalgenius.pages.dev',
  EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs',
  SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co',
  ACCOUNT_PROVISIONING_ENABLED:'enabled',ACCOUNT_PROVISIONING_RELEASE:'reviewed-v1'};
 assert.equal(isProvisioningEnabled(correct),true);
 for(const env of [correct,{...correct,APP_ENV:'staging'},{
  ...correct,APP_ORIGIN:'https://preview.portalgenius.pages.dev'}]){
  assert.equal(isStaffPasswordResetEnabled(env),false);
 }
});
test('production creation requires explicit dual opt-in and exact project identity',()=>{
 const production={APP_ENV:'production',APP_ORIGIN:'https://portalgenius.pages.dev',
  EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs',
  SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co'};
 assert.equal(isProvisioningEnabled(production),false);
 assert.equal(isProvisioningEnabled({...production,ACCOUNT_PROVISIONING_ENABLED:'enabled'}),false);
 const enabled={...production,ACCOUNT_PROVISIONING_ENABLED:'enabled',
  ACCOUNT_PROVISIONING_RELEASE:'reviewed-v1'};
 assert.equal(isProvisioningEnabled(enabled),true);
 assert.equal(isStaffPasswordResetEnabled(enabled),false);
 for(const change of [
  {APP_ENV:'staging'}, {APP_ORIGIN:'https://portalgenius.pages.dev.attacker.test'},
  {SUPABASE_URL:'https://other.supabase.co'},
  {EXPECTED_SUPABASE_PROJECT_REF:'other'},
  {ACCOUNT_PROVISIONING_RELEASE:'yes'},
  {ACCOUNT_PROVISIONING_ENABLED:'true'}
 ])assert.equal(isProvisioningEnabled({...enabled,...change}),false);
});
test('staging flag cannot enable password reset on production origin',()=>{
 const env={APP_ENV:'staging',APP_ORIGIN:'https://portalgenius.pages.dev',
  ACCOUNT_PROVISIONING_ENABLED:'enabled'};
 assert.equal(isProvisioningEnabled(env),false);
 assert.equal(isStaffPasswordResetEnabled(env),false);
});
test('account create blocks anonymous caller without reading secrets',async()=>{
 const response=await onRequestPost({request:new Request('https://portalgenius.pages.dev/api/v1/accounts/create',{
  method:'POST',headers:{Origin:'https://portalgenius.pages.dev','Content-Type':'application/json'},body:'{}'
 }),env:{}});
 assert.equal(response.status,401);
 assert.equal((await response.json()).error.code,'NOT_AUTHENTICATED');
});
test('account create blocks hostile Origin before touching session',async()=>{
 const response=await onRequestPost({request:new Request('https://portalgenius.pages.dev/api/v1/accounts/create',{
  method:'POST',headers:{Origin:'https://attacker.invalid','Content-Type':'application/json'},body:'{}'
 }),env:{}});
 assert.equal(response.status,403);
 assert.equal((await response.json()).error.code,'ORIGIN_DENIED');
});

import {validateProvisionRequest} from '../../contracts/accounts/provisionValidation.ts';
test('account creation form never accepts user-provided Auth emails',()=>{
 for(const key of ['email','authEmail','password']){
  const payload={username:'guru_001',displayName:'Guru 001',role:'teacher',[key]:'dummy@example.com'};
  assert.equal(validateProvisionRequest(payload),null);
 }
 assert.deepEqual(validateProvisionRequest({username:'Guru_001',displayName:'Guru 001',role:'teacher'}),{
  username:'guru_001',displayName:'Guru 001',role:'teacher'
 });
});
