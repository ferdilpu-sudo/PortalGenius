/**
 * Read-only case classification for a reset with an uncertain Auth outcome.
 * No password, retry, ledger write or user mutation is permitted here.
 * The operator must consult independent evidence before any later recovery.
 */
export type ResetCase={
 requestedOperationId:string;
 requestedTargetId:string;
 operation:null|{
  id:string;targetId:string;actorId:string;state:'pending'|'completed';
  completedAt:string|null
 };
 account:null|{
  id:string;active:boolean;mustChangePassword:boolean;roles:string[];
  managedBy:string;identityKind:string
 };
 audit:{requested:boolean;completed:boolean};
 appSessionsRevoked:boolean|null;
 authUpdateOutcome:'confirmed'|'failed'|'timed_out'|'unknown';
};

export type ResetCaseDecision={
 status:'EVIDENCE_MISSING'|'IDENTITY_MISMATCH'|'INVARIANT_VIOLATION'|
  'PENDING_MANUAL_REVIEW'|'COMPLETED_MANUAL_REVIEW';
 permitsPasswordDisclosure:false;
 permitsAutomaticRetry:false;
 permitsLedgerMutation:false;
};

/**
 * Intentional fail-closed invariant: no result of this function can authorize
 * disclosure, reissue, retries, superseding operations or ledger changes.
 */
export function classifyResetReconciliation(value:ResetCase):ResetCaseDecision{
 const decide=(status:ResetCaseDecision['status']):ResetCaseDecision=>({
  status,permitsPasswordDisclosure:false,permitsAutomaticRetry:false,
  permitsLedgerMutation:false
 });
 const {operation,account,audit}=value;
 if(!operation||!account||!audit||
  typeof value.requestedTargetId!=='string'||
  typeof value.requestedOperationId!=='string')return decide('EVIDENCE_MISSING');
 if(operation.id!==value.requestedOperationId||
  operation.targetId!==value.requestedTargetId||
  account.id!==value.requestedTargetId||
  operation.actorId===value.requestedTargetId)
  return decide('IDENTITY_MISMATCH');
 const isStaff=account.roles.some(role=>
  ['teacher','counselor','principal'].includes(role)
 )&&!account.roles.includes('admin');
 if(!account.active||!isStaff||
  account.managedBy!=='portalgenius'||
  account.identityKind!=='technical_email_no_delivery'||
  !account.mustChangePassword||value.appSessionsRevoked!==true||
  !audit.requested)
  return decide('INVARIANT_VIOLATION');
 if(operation.state==='pending'){
  if(operation.completedAt!==null||audit.completed)
   return decide('INVARIANT_VIOLATION');
  // A success response from Auth does not resolve a pending ledger operation.
  return decide('PENDING_MANUAL_REVIEW');
 }
 if(operation.state==='completed'){
  if(!operation.completedAt||!audit.completed)
   return decide('INVARIANT_VIOLATION');
  // A completed ledger is not permission to recover or reissue a password.
  return decide('COMPLETED_MANUAL_REVIEW');
 }
 return decide('INVARIANT_VIOLATION');
}
