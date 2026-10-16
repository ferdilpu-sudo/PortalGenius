import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyResetReconciliation} from '../../server/accounts/classifyResetReconciliation.ts';

const target='7518d71c-46ce-4131-9bf7-786fa42c3bc5';
const actor='e24e8402-9092-425c-8a32-472096c816d2';
const op='67dbcd63-56bb-44a4-817b-7909c4ad260a';
function pendingCase(){
 return {
  requestedOperationId:op,requestedTargetId:target,
  operation:{id:op,targetId:target,actorId:actor,state:'pending',completedAt:null},
  account:{id:target,active:true,mustChangePassword:true,
   roles:['teacher'],managedBy:'portalgenius',identityKind:'technical_email_no_delivery'},
  audit:{requested:true,completed:false},appSessionsRevoked:true,
  authUpdateOutcome:'unknown'
 };
}
function decision(value,expected){
 const result=classifyResetReconciliation(value);
 assert.equal(result.status,expected);
 assert.equal(result.permitsPasswordDisclosure,false);
 assert.equal(result.permitsAutomaticRetry,false);
 assert.equal(result.permitsLedgerMutation,false);
}
test('read-only triage always blocks mutation for pending uncertainty',()=>{
 for(const outcome of ['unknown','timed_out','failed','confirmed'])
  decision({...pendingCase(),authUpdateOutcome:outcome},'PENDING_MANUAL_REVIEW');
});
test('missing case, account or audit evidence cannot unlock a pending reset',()=>{
 decision({...pendingCase(),operation:null},'EVIDENCE_MISSING');
 decision({...pendingCase(),account:null},'EVIDENCE_MISSING');
 decision({...pendingCase(),audit:null},'EVIDENCE_MISSING');
});
test('cross-target, mismatched operation, and self-reset identities are denied',()=>{
 decision({...pendingCase(),requestedOperationId:actor},'IDENTITY_MISMATCH');
 decision({...pendingCase(),requestedTargetId:actor},'IDENTITY_MISMATCH');
 decision({...pendingCase(),operation:{...pendingCase().operation,actorId:target}},'IDENTITY_MISMATCH');
});
test('privileged or inactive accounts cannot be reconciled as staff',()=>{
 decision({...pendingCase(),account:{...pendingCase().account,roles:['admin','teacher']}},'INVARIANT_VIOLATION');
 decision({...pendingCase(),account:{...pendingCase().account,roles:['student']}},'INVARIANT_VIOLATION');
 decision({...pendingCase(),account:{...pendingCase().account,active:false}},'INVARIANT_VIOLATION');
});
test('unmanaged Auth identities never pass operator-only triage',()=>{
 decision({...pendingCase(),account:{...pendingCase().account,managedBy:'someone_else'}},'INVARIANT_VIOLATION');
 decision({...pendingCase(),account:{...pendingCase().account,identityKind:'email'}},'INVARIANT_VIOLATION');
});
test('reset must preserve must-change and explicit session revocation evidence',()=>{
 decision({...pendingCase(),account:{...pendingCase().account,mustChangePassword:false}},'INVARIANT_VIOLATION');
 decision({...pendingCase(),appSessionsRevoked:false},'INVARIANT_VIOLATION');
 decision({...pendingCase(),appSessionsRevoked:null},'INVARIANT_VIOLATION');
});
test('audit contradictions do not resolve pending operations',()=>{
 decision({...pendingCase(),audit:{requested:false,completed:false}},'INVARIANT_VIOLATION');
 decision({...pendingCase(),audit:{requested:true,completed:true}},'INVARIANT_VIOLATION');
 decision({...pendingCase(),operation:{...pendingCase().operation,completedAt:'2026-10-16T10:00:00Z'}},'INVARIANT_VIOLATION');
});
test('completed reset can be inspected but still cannot reissue credentials',()=>{
 const value={...pendingCase(),
  operation:{...pendingCase().operation,state:'completed',completedAt:'2026-10-16T10:00:00Z'},
  audit:{requested:true,completed:true},authUpdateOutcome:'confirmed'};
 decision(value,'COMPLETED_MANUAL_REVIEW');
 decision({...value,authUpdateOutcome:'unknown'},'COMPLETED_MANUAL_REVIEW');
 decision({...value,operation:{...value.operation,completedAt:null}},'INVARIANT_VIOLATION');
 decision({...value,audit:{requested:true,completed:false}},'INVARIANT_VIOLATION');
});
