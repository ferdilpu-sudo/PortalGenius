import type {ResetGateway} from './staffPasswordResetGateway.ts';
import {newTemporaryPassword} from './newTemporaryPassword.ts';
/**
 * Deliberately no implicit retry. Once 'begin' succeeds the target's app
 * sessions are revoked and must_change_password=true in the same SQL tx.
 * Any unknown Auth update/complete outcome stays pending for human review.
 */
export async function resetStaffPassword(
 gateway:ResetGateway,actorId:string,targetId:string,
 operationId:string,requestId:string
):Promise<{temporaryPassword:string;mustChangePassword:true}>{
 await gateway.begin(actorId,targetId,operationId,requestId);
 const password=newTemporaryPassword();
 try{
  await gateway.setPassword(targetId,password);
  await gateway.complete(actorId,targetId,operationId);
 }catch{
  // The operation stays locked pending: do not return a password that may
  // not match Auth, and do not mark a failed update as successful.
  throw new Error('RESET_REVIEW_REQUIRED');
 }
 return {temporaryPassword:password,mustChangePassword:true};
}
