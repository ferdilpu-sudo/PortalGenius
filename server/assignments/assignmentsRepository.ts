import type {SupabaseClient} from '@supabase/supabase-js';
export type AssignmentSummary={id:string;teacherCode:string;subjectName:string;termName:string;
 validFrom:string;validTo:string|null;studentCount:number;archivedAt:string|null};
export async function listAssignments(db:SupabaseClient,actorId:string):Promise<AssignmentSummary[]>{
 const {data,error}=await db.rpc('pg_m002c_list_assignments',{p_actor_id:actorId});
 if(error?.code==='42501')throw new Error('FORBIDDEN');
 if(error||!Array.isArray(data))throw new Error('ASSIGNMENTS_UNAVAILABLE');
 return data as AssignmentSummary[];
}
