import type {SupabaseClient} from '@supabase/supabase-js';
import type {TermInput} from '../../contracts/master/termValidation.ts';
import {checkMasterError} from './masterErrors.ts';
export type Term={id:string;yearId:string;name:string;startDate:string;endDate:string;locked:boolean;version:number};
export async function listTerms(db:SupabaseClient):Promise<Term[]>{
 const {data,error}=await db.from('terms').select('id,year_id,name,start_date,end_date,locked,version')
  .order('start_date',{ascending:false}).order('id',{ascending:true}).limit(200);
 checkMasterError(error,'TERMS');
 return (data??[]).map(v=>({id:v.id,yearId:v.year_id,name:v.name,startDate:v.start_date,
  endDate:v.end_date,locked:v.locked,version:v.version}));
}
export async function createTerm(db:SupabaseClient,input:TermInput,actorId:string,key:string,requestId:string):Promise<Term>{
 const {data,error}=await db.rpc('pg_m002_create_term',{p_actor_id:actorId,p_year_id:input.yearId,
  p_name:input.name,p_start_date:input.startDate,p_end_date:input.endDate,
  p_idempotency_key:key,p_request_id:requestId});
 checkMasterError(error,'TERMS');
 if(!data||typeof data.id!=='string')throw new Error('TERMS_UNAVAILABLE');
 return data as Term;
}
