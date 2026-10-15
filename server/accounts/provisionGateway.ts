import type {SupabaseClient} from '@supabase/supabase-js';
import type {ProvisionRequest} from '../../contracts/accounts/provisionValidation.ts';
import type {ProvisionIdentity} from './technicalAuthAlias.ts';

export type AccountProvisionSummary={
 id:string;username:string;displayName:string;role:ProvisionRequest['role'];
 active:true;mustChangePassword:true
};
export type ProvisionGateway={
 readResult:(actorId:string,key:string,request:ProvisionIdentity)=>Promise<AccountProvisionSummary|null>;
 createAuth:(email:string,password:string)=>Promise<string>;
 bindAccount:(actorId:string,userId:string,request:ProvisionIdentity,key:string,
  requestId:string)=>Promise<AccountProvisionSummary>;
 deleteAuth:(userId:string)=>Promise<boolean>;
};
export function provisionGateway(client:SupabaseClient):ProvisionGateway{
 return {
  async readResult(actorId,key,request){
   const {data,error}=await client.rpc('pg_m002c2_provision_result',{
    p_actor_id:actorId,p_idempotency_key:key,
    p_username:request.username,p_auth_alias:request.authEmail,
    p_display_name:request.displayName,p_role:request.role
   });
   if(error)throw new Error(error.code==='42501'?'FORBIDDEN':error.code==='23505'?'PROVISION_CONFLICT':'PROVISION_LOOKUP_UNAVAILABLE');
   if(data===null)return null;
   if(typeof data?.id!=='string')throw new Error('PROVISION_LOOKUP_UNAVAILABLE');
   return data as AccountProvisionSummary;
  },
  async createAuth(email,password){
   const {data,error}=await client.auth.admin.createUser({
    email,password,email_confirm:true,app_metadata:{managed_by:'portalgenius'}
   });
   if(error||!data.user?.id)throw new Error('AUTH_PROVISION_FAILED');
   return data.user.id;
  },
  async bindAccount(actorId,userId,request,key,requestId){
   const {data,error}=await client.rpc('pg_m002c2_attach_account',{
    p_actor_id:actorId,p_new_auth_user_id:userId,
    p_username:request.username,p_auth_alias:request.authEmail,
    p_display_name:request.displayName,p_role:request.role,
    p_idempotency_key:key,p_request_id:requestId
   });
   if(error){
    if(error.code==='23505')throw new Error('PROVISION_CONFLICT');
    if(error.code==='42501')throw new Error('FORBIDDEN');
    if(error.code==='22023')throw new Error('PROVISION_INVALID');
    throw new Error('PROVISION_BIND_UNAVAILABLE');
   }
   if(typeof data?.id!=='string')throw new Error('PROVISION_BIND_UNAVAILABLE');
   return data as AccountProvisionSummary;
  },
  async deleteAuth(userId){
   const {error}=await client.auth.admin.deleteUser(userId);
   return !error;
  }
 };
}
