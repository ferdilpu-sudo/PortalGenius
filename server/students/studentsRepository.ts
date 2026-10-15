import type {SupabaseClient} from '@supabase/supabase-js';
export type StudentSummary={id:string;nis:string;fullName:string};
export async function listScopedStudents(db:SupabaseClient,actorId:string,onDate:string):Promise<StudentSummary[]>{
 const {data,error}=await db.rpc('pg_m002c_visible_students',{p_actor_id:actorId,p_on_date:onDate});
 if(error||!Array.isArray(data))throw new Error('STUDENTS_UNAVAILABLE');
 return data as StudentSummary[];
}
