import type {SupabaseClient} from '@supabase/supabase-js';
import type {CatalogInput} from '../../contracts/master/catalogValidation.ts';
import {checkMasterError} from './masterErrors.ts';
export type CatalogKind='program'|'subject';
export type CatalogRow={id:string;code:string;name:string;archivedAt:string|null;version:number};
export async function listCatalog(db:SupabaseClient,kind:CatalogKind):Promise<CatalogRow[]>{
 const table=kind==='program'?'programs':'subjects';
 const {data,error}=await db.from(table).select('id,code,name,archived_at,version')
  .order('code',{ascending:true}).limit(200);
 checkMasterError(error,'CATALOG');
 return (data??[]).map(v=>({id:v.id,code:v.code,name:v.name,
  archivedAt:v.archived_at,version:v.version}));
}
export async function createCatalog(db:SupabaseClient,kind:CatalogKind,input:CatalogInput,
 actorId:string,key:string,requestId:string):Promise<CatalogRow>{
 const {data,error}=await db.rpc('pg_m002_create_catalog_entry',{p_actor_id:actorId,p_kind:kind,
  p_code:input.code,p_name:input.name,p_idempotency_key:key,p_request_id:requestId});
 checkMasterError(error,'CATALOG');
 if(!data||typeof data.id!=='string')throw new Error('CATALOG_UNAVAILABLE');
 return data as CatalogRow;
}
