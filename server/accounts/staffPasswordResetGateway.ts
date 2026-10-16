import type {SupabaseClient} from '@supabase/supabase-js';
export type ResetGateway={
 begin:(actorId:string,targetId:string,operationId:string,requestId:string)=>Promise<void>;
 setPassword:(targetId:string,password:string)=>Promise<void>;
 complete:(actorId:string,targetId:string,operationId:string)=>Promise<void>;
};
export function staffPasswordResetGateway(db:SupabaseClient):ResetGateway{
 return {
  async begin(actorId,targetId,operationId,requestId){
   const {data,error}=await db.rpc('pg_m002c2_begin_staff_password_reset',{
    p_actor_id:actorId,p_target_id:targetId,p_operation_id:operationId,p_request_id:requestId
   });
   if(error?.code==='42501')throw new Error('RESET_FORBIDDEN');
   if(error?.code==='23505')throw new Error('RESET_PENDING');
   if(error?.code==='22023')throw new Error('RESET_INVALID');
   if(error||data?.state!=='pending'||data?.operationId!==operationId)
    throw new Error('RESET_BEGIN_UNAVAILABLE');
  },
  async setPassword(targetId,password){
   const {error}=await db.auth.admin.updateUserById(targetId,{password});
   if(error)throw new Error('RESET_AUTH_UPDATE_FAILED');
  },
  async complete(actorId,targetId,operationId){
   const {data,error}=await db.rpc('pg_m002c2_complete_staff_password_reset',{
    p_actor_id:actorId,p_target_id:targetId,p_operation_id:operationId
   });
   if(error||data!==true)throw new Error('RESET_COMPLETE_UNAVAILABLE');
  }
 };
}
