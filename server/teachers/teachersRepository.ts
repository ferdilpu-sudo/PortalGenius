import type {SupabaseClient} from '@supabase/supabase-js';
export type TeacherSummary={id:string;code:string;accountId:string|null;
 displayName:string|null;archivedAt:string|null;version:number};
export async function listTeachers(db:SupabaseClient,actorId:string):Promise<TeacherSummary[]>{
 const {data,error}=await db.rpc('pg_m002c_list_teachers',{p_actor_id:actorId});
 if(error?.code==='42501')throw new Error('FORBIDDEN');
 if(error||!Array.isArray(data))throw new Error('TEACHERS_UNAVAILABLE');
 return data as TeacherSummary[];
}
