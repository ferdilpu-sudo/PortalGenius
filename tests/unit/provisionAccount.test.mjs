import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProvisionRequest} from '../../contracts/accounts/provisionValidation.ts';
import {provisionAccount} from '../../server/accounts/provisionAccount.ts';
import {technicalAuthAlias,withTechnicalAlias,INTERNAL_AUTH_DOMAIN} from '../../server/accounts/technicalAuthAlias.ts';
const valid={username:'teacher_one',displayName:'Teacher One',role:'teacher'};
const result={id:'user-001',username:'teacher_one',displayName:'Teacher One',
 role:'teacher',active:true,mustChangePassword:true};
test('validates staff roles and never accepts password or admin escalation',()=>{
 assert.deepEqual(validateProvisionRequest({...valid,username:' TEACHER_ONE '}),valid);
 for(const payload of [
  {...valid,role:'admin'},{...valid,role:'student'}, {...valid,password:'hidden'},
  {...valid,active:true},{...valid,authEmail:'teacher@other.example'}, {...valid,email:'teacher@example.com'},
  {...valid,username:'root'}, {...valid,displayName:' '}
 ])assert.equal(validateProvisionRequest(payload),null);
});
test('creates Auth identity, links DB and returns random temporary password once',async()=>{
 const calls=[];
 const gateway={
  readResult:async()=>null,
  createAuth:async(email,password)=>{calls.push({email,password});return 'user-001';},
  bindAccount:async()=>result,
  deleteAuth:async()=>{throw Error('unexpected cleanup');}
 };
 const response=await provisionAccount(gateway,'admin','65b9f672-6ca5-4921-a81c-5361f824a201','req',valid);
 assert.equal(response.account.id,'user-001');
 assert.equal(response.alreadyCompleted,false);
 assert.match(response.temporaryPassword,/^[A-Za-z0-9_-]{40}$/);
 assert.equal(calls.length,1);
 assert.equal(calls[0].email,'pg-65b9f6726ca54921a81c5361f824a201@'+INTERNAL_AUTH_DOMAIN);
});
test('idempotent retry never creates another Auth user or reissues password',async()=>{
 const gateway={
  readResult:async()=>result,createAuth:async()=>{throw Error('should not create');},
  bindAccount:async()=>{throw Error('should not bind');},deleteAuth:async()=>false
 };
 assert.deepEqual(await provisionAccount(gateway,'admin','65b9f672-6ca5-4921-a81c-5361f824a201','req',valid),{
  account:result,temporaryPassword:null,alreadyCompleted:true
 });
});
test('failed atomic bind cleans up only the freshly created Auth identity',async()=>{
 let deleted='';
 const gateway={
  readResult:async()=>null,createAuth:async()=> 'created-002',
  bindAccount:async()=>{throw new Error('PROVISION_CONFLICT');},
  deleteAuth:async(id)=>{deleted=id;return true;}
 };
 await assert.rejects(provisionAccount(gateway,'admin','65b9f672-6ca5-4921-a81c-5361f824a201','req',valid),/PROVISION_CONFLICT/);
 assert.equal(deleted,'created-002');
});
test('unknown bind outcome never deletes Auth user without reliable reconciliation',async()=>{
 let deletes=0,reads=0;
 const gateway={
  readResult:async()=>{if(++reads===1)return null;throw Error('network failed');},
  createAuth:async()=> 'created-003',
  bindAccount:async()=>{throw Error('timeout');},
  deleteAuth:async()=>{deletes++;return true;}
 };
 await assert.rejects(provisionAccount(gateway,'admin','65b9f672-6ca5-4921-a81c-5361f824a201','req',valid),/PROVISION_RECONCILIATION_REQUIRED/);
 assert.equal(deletes,0);
});
test('commit detected after timeout returns previous result without deleting Auth',async()=>{
 let reads=0;
 const gateway={
  readResult:async()=>++reads===1?null:result,
  createAuth:async()=> 'user-001',
  bindAccount:async()=>{throw Error('timeout');},
  deleteAuth:async()=>{throw Error('must not delete committed');}
 };
 const response=await provisionAccount(gateway,'admin','65b9f672-6ca5-4921-a81c-5361f824a201','req',valid);
 assert.equal(response.account.id,'user-001');
 assert.equal(response.alreadyCompleted,false);
});
test('auth failure does not call DB bind or cleanup unrelated identities',async()=>{
 const gateway={
  readResult:async()=>null,
  createAuth:async()=>{throw Error('AUTH_PROVISION_FAILED');},
  bindAccount:async()=>{throw Error('should not bind');},
  deleteAuth:async()=>{throw Error('should not delete');}
 };
 await assert.rejects(provisionAccount(gateway,'admin','65b9f672-6ca5-4921-a81c-5361f824a201','req',valid),/AUTH_PROVISION_FAILED/);
});

test('idempotency lookup receives full payload, not just the key',async()=>{
 let readPayload;
 const gateway={
  readResult:async(actor,key,request)=>{readPayload=request;return result;},
  createAuth:async()=>{throw Error('unexpected auth call');},
  bindAccount:async()=>{throw Error('unexpected bind');},deleteAuth:async()=>false
 };
 await provisionAccount(gateway,'admin','65b9f672-6ca5-4921-a81c-5361f824a201','req',valid);
 assert.deepEqual(readPayload,withTechnicalAlias(valid,'65b9f672-6ca5-4921-a81c-5361f824a201'));
});

test('internal email generated from UUID, never from personal identity',()=>{
 const key='65b9f672-6ca5-4921-a81c-5361f824a201';
 assert.equal(technicalAuthAlias(key),'pg-65b9f6726ca54921a81c5361f824a201@auth.portalgenius.invalid');
 assert.equal(technicalAuthAlias(key),technicalAuthAlias(key));
 assert.notEqual(technicalAuthAlias(key),technicalAuthAlias('65b9f672-6ca5-4921-a81c-5361f824a202'));
 assert.throws(()=>technicalAuthAlias('not-a-uuid'),/INVALID_IDEMPOTENCY_KEY/);
});
