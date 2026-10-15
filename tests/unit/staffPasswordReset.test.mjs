import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resetStaffPassword} from '../../server/accounts/resetStaffPassword.ts';
import {validateResetPasswordRequest} from '../../contracts/accounts/resetPasswordValidation.ts';
import {onRequestPost} from '../../functions/api/v1/accounts/reset-password.ts';
const id='7518d71c-46ce-4131-9bf7-786fa42c3bc5';
test('staff reset payload accepts only target UUID; never client password',()=>{
 assert.deepEqual(validateResetPasswordRequest({targetId:id}),{targetId:id});
 for(const bad of [{targetId:'invalid'}, {targetId:id,password:'hello'},
  {targetId:id,email:'x@x.com'}, {targetId:id,role:'admin'}, {},null,[]])
 assert.equal(validateResetPasswordRequest(bad),null);
});
test('reset revokes sessions before Auth update, completes audit then releases password once',async()=>{
 const calls=[];
 const gateway={
  begin:async()=>{calls.push('begin');},
  setPassword:async(target,password)=>{assert.equal(target,id);calls.push('auth');assert.match(password,/^[A-Za-z0-9_-]{40}$/);},
  complete:async()=>{calls.push('complete');}
 };
 const r=await resetStaffPassword(gateway,'admin',id,'op','req');
 assert.deepEqual(calls,['begin','auth','complete']);
 assert.equal(r.mustChangePassword,true);
 assert.match(r.temporaryPassword,/^[A-Za-z0-9_-]{40}$/);
});
test('begin rejection never changes Auth credentials',async()=>{
 let updates=0;
 const gateway={
  begin:async()=>{throw Error('RESET_PENDING');},
  setPassword:async()=>{updates++;},
  complete:async()=>{updates++;}
 };
 await assert.rejects(resetStaffPassword(gateway,'admin',id,'op','req'),/RESET_PENDING/);
 assert.equal(updates,0);
});
test('Auth timeout leaves reset pending, never issues uncertain password',async()=>{
 let completed=0;
 const gateway={
  begin:async()=>{},
  setPassword:async()=>{throw Error('timeout');},
  complete:async()=>{completed++;}
 };
 await assert.rejects(resetStaffPassword(gateway,'admin',id,'op','req'),/RESET_REVIEW_REQUIRED/);
 assert.equal(completed,0);
});
test('DB completion failure never releases password',async()=>{
 const gateway={
  begin:async()=>{},setPassword:async()=>{},
  complete:async()=>{throw Error('connection lost');}
 };
 await assert.rejects(resetStaffPassword(gateway,'admin',id,'op','req'),/RESET_REVIEW_REQUIRED/);
});
test('reset API requires same origin, session and refuses unknown origin',async()=>{
 const origin='https://portalgenius.pages.dev';
 const bad=await onRequestPost({request:new Request(origin+'/api/v1/accounts/reset-password',{
   method:'POST',headers:{Origin:'https://untrusted.invalid','Content-Type':'application/json'},body:'{}'
 }),env:{}});
 assert.equal(bad.status,403);
 const anon=await onRequestPost({request:new Request(origin+'/api/v1/accounts/reset-password',{
   method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'
 }),env:{}});
 assert.equal(anon.status,401);
});
