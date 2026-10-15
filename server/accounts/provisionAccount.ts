import type {ProvisionRequest} from '../../contracts/accounts/provisionValidation.ts';
import {newTemporaryPassword} from './newTemporaryPassword.ts';
import type {AccountProvisionSummary,ProvisionGateway} from './provisionGateway.ts';

export type ProvisionResult={
 account:AccountProvisionSummary;temporaryPassword:string|null;alreadyCompleted:boolean
};
/**
 * Provisioning is an operator-initiated, admin-only operation.
 * Never delete a just-created Auth user when DB outcome cannot be determined.
 * A possible partial state blocks further writes until a human reconciles it.
 */
export async function provisionAccount(
 gateway:ProvisionGateway,actorId:string,key:string,requestId:string,
 request:ProvisionRequest
):Promise<ProvisionResult>{
 const existing=await gateway.readResult(actorId,key);
 if(existing)return {account:existing,temporaryPassword:null,alreadyCompleted:true};

 const password=newTemporaryPassword();
 const newId=await gateway.createAuth(request.authEmail,password);
 try{
  const account=await gateway.bindAccount(actorId,newId,request,key,requestId);
  if(account.id!==newId)throw new Error('PROVISION_RECONCILIATION_REQUIRED');
  return {account,temporaryPassword:password,alreadyCompleted:false};
 }catch(error){
  // A transport error could mean the atomic bind committed, so consult its
  // idempotency journal before deciding whether an Auth identity is orphaned.
  let completed:AccountProvisionSummary|null;
  try{completed=await gateway.readResult(actorId,key);}
  catch{throw new Error('PROVISION_RECONCILIATION_REQUIRED');}
  if(completed?.id===newId){
   return {account:completed,temporaryPassword:password,alreadyCompleted:false};
  }
  if(!await gateway.deleteAuth(newId))
   throw new Error('PROVISION_RECONCILIATION_REQUIRED');
  if(completed)throw new Error('PROVISION_CONFLICT');
  throw error;
 }
}
