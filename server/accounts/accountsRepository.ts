import type {SupabaseClient} from '@supabase/supabase-js';
export type AccountSummary={id:string;username:string|null;displayName:string;
 active:boolean;mustChangePassword:boolean;roles:('admin'|'teacher'|'counselor'|'principal')[]};
export async function listAccounts(db:SupabaseClient,actorId:string):Promise<AccountSummary[]>{
 const {data,error}=await db.rpc('pg_m002c_list_accounts',{p_actor_id:actorId});
 if(error?.code==='42501')throw new Error('FORBIDDEN');
 if(error||!Array.isArray(data))throw new Error('ACCOUNTS_UNAVAILABLE');
 return data as AccountSummary[];
}
