import type { SupabaseClient } from '@supabase/supabase-js';

export type AcademicYear={
  id:string;label:string;startDate:string;endDate:string;version:number
};
export async function listAcademicYears(admin:SupabaseClient):Promise<AcademicYear[]> {
  const {data,error}=await admin.from('academic_years')
    .select('id,label,start_date,end_date,version').order('start_date',{ascending:false})
    .order('id',{ascending:true}).limit(200);
  if(error)throw new Error('ACADEMIC_YEARS_UNAVAILABLE');
  return (data??[]).map(y=>({
    id:y.id as string,label:y.label as string,
    startDate:y.start_date as string,endDate:y.end_date as string,
    version:y.version as number
  }));
}
export async function createAcademicYear(admin:SupabaseClient,input:{
  actorId:string;label:string;startDate:string;endDate:string;key:string;requestId:string
}):Promise<AcademicYear> {
  const {data,error}=await admin.rpc('pg_m002_create_academic_year',{
    p_actor_id:input.actorId,p_label:input.label,p_start_date:input.startDate,
    p_end_date:input.endDate,p_idempotency_key:input.key,p_request_id:input.requestId
  });
  if(error){
    if(error.code==='23505')throw new Error('ACADEMIC_YEAR_CONFLICT');
    if(error.code==='22023')throw new Error('ACADEMIC_YEAR_INVALID');
    if(error.code==='42501')throw new Error('FORBIDDEN');
    throw new Error('ACADEMIC_YEAR_UNAVAILABLE');
  }
  if(!data||typeof data.id!=='string'||typeof data.label!=='string')throw new Error('ACADEMIC_YEAR_UNAVAILABLE');
  return data as AcademicYear;
}
