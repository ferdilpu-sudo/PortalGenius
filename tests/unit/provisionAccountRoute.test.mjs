import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../../functions/api/v1/accounts/create.ts';
import {isProvisioningEnabled} from '../../server/accounts/provisioningGate.ts';
test('account provisioning flag is OFF without explicit staging opt-in',()=>{
 assert.equal(isProvisioningEnabled({APP_ENV:'staging'}),false);
 assert.equal(isProvisioningEnabled({APP_ENV:'production',ACCOUNT_PROVISIONING_ENABLED:'enabled'}),false);
 assert.equal(isProvisioningEnabled({APP_ENV:'staging',ACCOUNT_PROVISIONING_ENABLED:'enabled'}),false);
 assert.equal(isProvisioningEnabled({APP_ENV:'staging',ACCOUNT_PROVISIONING_ENABLED:'enabled',
  APP_ORIGIN:'https://portalgenius.pages.dev'}),false);
 assert.equal(isProvisioningEnabled({APP_ENV:'staging',ACCOUNT_PROVISIONING_ENABLED:'enabled',
  APP_ORIGIN:'https://test-m002c2.portalgenius.pages.dev'}),true);
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
