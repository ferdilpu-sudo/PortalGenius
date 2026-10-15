import type {SupabaseClient} from '@supabase/supabase-js';
import type {ClassInput} from '../../contracts/master/classValidation.ts';
import {checkMasterError} from './masterErrors.ts';
export type SchoolClass={id:string;yearId:string;level:'sd'|'smp'|'sma';grade:number;
 name:string;archivedAt:string|null;version:number};
export async function listClasses(db:SupabaseClient):Promise<SchoolClass[]>{
 const {data,error}=await db.from('classes').select('id,year_id,level,grade,name,archived_at,version')
  .order('grade',{ascending:true}).order('name',{ascending:true}).limit(200);
 checkMasterError(error,'CLASSES');
 return (data??[]).map(v=>({id:v.id,yearId:v.year_id,level:v.level,grade:v.grade,
  name:v.name,archivedAt:v.archived_at,version:v.version}));
}
export async function createClass(db:SupabaseClient,input:ClassInput,actorId:string,
 key:string,requestId:string):Promise<SchoolClass>{
 const {data,error}=await db.rpc('pg_m002_create_class',{p_actor_id:actorId,p_year_id:input.yearId,
  p_level:input.level,p_grade:input.grade,p_name:input.name,
  p_idempotency_key:key,p_request_id:requestId});
 checkMasterError(error,'CLASSES');
 if(!data||typeof data.id!=='string')throw new Error('CLASSES_UNAVAILABLE');
 return data as SchoolClass;
}
