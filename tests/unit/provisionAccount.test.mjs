import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProvisionRequest} from '../../contracts/accounts/provisionValidation.ts';
import {provisionAccount} from '../../server/accounts/provisionAccount.ts';
const valid={username:'teacher_one',displayName:'Teacher One',authEmail:'teacher@example.com',role:'teacher'};
const result={id:'user-001',username:'teacher_one',displayName:'Teacher One',
 role:'teacher',active:true,mustChangePassword:true};
test('validates staff roles and never accepts password or admin escalation',()=>{
 assert.deepEqual(validateProvisionRequest({...valid,username:' TEACHER_ONE '}),valid);
 for(const payload of [
  {...valid,role:'admin'},{...valid,role:'student'}, {...valid,password:'hidden'},
  {...valid,active:true},{...valid,authEmail:'not-email'},
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
 const response=await provisionAccount(gateway,'admin','key','req',valid);
 assert.equal(response.account.id,'user-001');
 assert.equal(response.alreadyCompleted,false);
 assert.match(response.temporaryPassword,/^[A-Za-z0-9_-]{40}$/);
 assert.equal(calls.length,1);
 assert.notEqual(calls[0].password,valid.authEmail);
});
test('idempotent retry never creates another Auth user or reissues password',async()=>{
 const gateway={
  readResult:async()=>result,createAuth:async()=>{throw Error('should not create');},
  bindAccount:async()=>{throw Error('should not bind');},deleteAuth:async()=>false
 };
 assert.deepEqual(await provisionAccount(gateway,'admin','key','req',valid),{
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
 await assert.rejects(provisionAccount(gateway,'admin','key','req',valid),/PROVISION_CONFLICT/);
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
 await assert.rejects(provisionAccount(gateway,'admin','key','req',valid),/PROVISION_RECONCILIATION_REQUIRED/);
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
 const response=await provisionAccount(gateway,'admin','key','req',valid);
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
 await assert.rejects(provisionAccount(gateway,'admin','key','req',valid),/AUTH_PROVISION_FAILED/);
});
