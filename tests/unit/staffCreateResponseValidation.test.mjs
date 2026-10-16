import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateStaffCreationResponse} from '../../contracts/accounts/staffCreateResponseValidation.ts';

const request={username:'Guru_001',displayName:' Guru Contoh ',role:'teacher'};
const response={
 account:{id:'7518d71c-46ce-4131-9bf7-786fa42c3bc5',username:'guru_001',
  displayName:'Guru Contoh',role:'teacher',active:true,mustChangePassword:true},
 temporaryPassword:'A'.repeat(40),alreadyCompleted:false
};
test('valid one-time staff password response is sanitized to approved fields',()=>{
 const accepted=validateStaffCreationResponse({...response,unexpectedSecret:'discard me',
  account:{...response.account,email:'unwanted@invalid.test'}},request);
 assert.deepEqual(accepted,response);
});
test('idempotent result cannot ever reissue a temporary password',()=>{
 assert.deepEqual(validateStaffCreationResponse({...response,
  temporaryPassword:null,alreadyCompleted:true},request),{
  ...response,temporaryPassword:null,alreadyCompleted:true
 });
 assert.equal(validateStaffCreationResponse({...response,
  alreadyCompleted:true},request),null);
 assert.equal(validateStaffCreationResponse({...response,
  temporaryPassword:null},request),null);
});
test('mismatched actor input or account invariants fail closed',()=>{
 for(const broken of [
  {...response,account:{...response.account,id:'invalid'}},
  {...response,account:{...response.account,username:'other'}},
  {...response,account:{...response.account,displayName:'Different'}},
  {...response,account:{...response.account,role:'admin'}},
  {...response,account:{...response.account,active:false}},
  {...response,account:{...response.account,mustChangePassword:false}},
  {...response,temporaryPassword:'too-short'},
  {...response,alreadyCompleted:'false'},
  {...response,account:null},
  {...response,account:[]},
  null
 ])assert.equal(validateStaffCreationResponse(broken,request),null);
});
