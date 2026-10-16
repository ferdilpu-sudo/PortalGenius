import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet} from '../../functions/api/v1/accounts/capabilities.ts';
import {loadStaffCapabilities,createStaffAccount,AccountRequestError} from '../../src/features/accounts/accountsApi.ts';

test('production bindings are declared production, never staging by hostname',()=>{
 const config=readFileSync('wrangler.toml','utf8');
 assert.match(config,/^APP_ENV = "production"$/m);
 assert.match(config,/^APP_ORIGIN = "https:\/\/portalgenius\.pages\.dev"$/m);
 assert.doesNotMatch(config,/^ACCOUNT_PROVISIONING_ENABLED\s*=/m);
 assert.doesNotMatch(config,/^ACCOUNT_PROVISIONING_RELEASE\s*=/m);
});
test('staff capabilities endpoint refuses anonymous callers without reading secrets',async()=>{
 const origin='https://portalgenius.pages.dev';
 const response=await onRequestGet({request:new Request(origin+'/api/v1/accounts/capabilities'),env:{}});
 assert.equal(response.status,401);
 assert.equal((await response.json()).error.code,'NOT_AUTHENTICATED');
});
test('capability client asks only same-origin and never caches a server flag',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(url,init)=>{
   assert.equal(url,'/api/v1/accounts/capabilities');
   assert.equal(init.credentials,'same-origin');
   assert.equal(init.cache,'no-store');
   return new Response(JSON.stringify({data:{canCreateStaff:false,canResetStaff:false}}));
  };
  assert.deepEqual(await loadStaffCapabilities(),{canCreateStaff:false,canResetStaff:false});
 }finally{globalThis.fetch=original;}
});
test('staff creation client sends validated shape, csrf and idempotency without email or password',async()=>{
 const original=globalThis.fetch;
 const key='ba2f2104-8d21-4756-9819-e779339344c4';
 try{
  globalThis.fetch=async(url,init)=>{
   assert.equal(url,'/api/v1/accounts/create');
   assert.equal(init.method,'POST');
   assert.equal(init.credentials,'same-origin');
   assert.equal(init.headers['Idempotency-Key'],key);
   assert.equal(init.headers['X-CSRF-Token'],'synthetic-csrf');
   assert.deepEqual(JSON.parse(init.body),{
    username:'guru_001',displayName:'Guru Contoh',role:'teacher'
   });
   return new Response(JSON.stringify({data:{
    account:{id:key,username:'guru_001',displayName:'Guru Contoh',
     role:'teacher',active:true,mustChangePassword:true},
    temporaryPassword:null,alreadyCompleted:true
   }}),{status:200});
  };
  const result=await createStaffAccount({
   username:'guru_001',displayName:'Guru Contoh',role:'teacher'
  },'synthetic-csrf',key);
  assert.equal(result.alreadyCompleted,true);
  assert.equal(result.temporaryPassword,null);
 }finally{globalThis.fetch=original;}
});
test('uncertain server response is not disguised as a successful staff creation',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response('not-json',{status:503});
  await assert.rejects(createStaffAccount({
   username:'guru_002',displayName:'Guru Kedua',role:'teacher'
  },'test','ba2f2104-8d21-4756-9819-e779339344c4'),
  e=>e instanceof AccountRequestError&&e.code==='UNKNOWN_RESPONSE');
 }finally{globalThis.fetch=original;}
});
test('client rejects wrong HTTP status and non-object response after an attempted write',async()=>{
 const original=globalThis.fetch;
 const key='ba2f2104-8d21-4756-9819-e779339344c4';
 const input={username:'guru_001',displayName:'Guru Contoh',role:'teacher'};
 try{
  for(const [data,status] of [
   [{account:{id:key,username:'guru_001',displayName:'Guru Contoh',
     role:'teacher',active:true,mustChangePassword:true},
     temporaryPassword:null,alreadyCompleted:true},201],
   [{account:{id:key,username:'guru_001',displayName:'Guru Contoh',
     role:'teacher',active:true,mustChangePassword:true},
     temporaryPassword:'A'.repeat(40),alreadyCompleted:false},200],
   [null,200]
  ]){
   globalThis.fetch=async()=>new Response(JSON.stringify(data===null?null:{data}),{
    status,headers:{'Content-Type':'application/json'}
   });
   await assert.rejects(createStaffAccount(input,'csrf',key),
    e=>e instanceof AccountRequestError&&e.code==='UNKNOWN_RESPONSE');
  }
 }finally{globalThis.fetch=original;}
});
