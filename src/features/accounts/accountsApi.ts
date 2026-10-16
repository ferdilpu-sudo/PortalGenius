import type {ProvisionRequest} from '../../../contracts/accounts/provisionValidation.ts';
import {validateStaffCreationResponse,type ValidatedStaffCreation} from '../../../contracts/accounts/staffCreateResponseValidation.ts';

type Envelope<T>={data?:T;error?:{code:string;message:string}};
export type StaffCapability={canCreateStaff:boolean;canResetStaff:boolean};
export type StaffCreation=ValidatedStaffCreation;
export class AccountRequestError extends Error{
 readonly code:string;
 constructor(code:string,message:string){
  super(message);this.name='AccountRequestError';this.code=code;
 }
}
async function readBody<T>(response:Response):Promise<Envelope<T>>{
 try{return await response.json() as Envelope<T>;}
 catch{throw new AccountRequestError('UNKNOWN_RESPONSE','Respons server tidak dapat dipastikan. Periksa daftar akun sebelum mencoba lagi.');}
}
export async function loadStaffCapabilities():Promise<StaffCapability>{
 const response=await fetch('/api/v1/accounts/capabilities',{
  credentials:'same-origin',cache:'no-store'
 });
 const body=await readBody<StaffCapability>(response);
 if(!response.ok||typeof body.data?.canCreateStaff!=='boolean'||
  typeof body.data.canResetStaff!=='boolean')
  throw new AccountRequestError(body.error?.code??'UNKNOWN_RESPONSE',
   body.error?.message??'Status fitur belum dapat dipastikan.');
 return body.data;
}
export async function createStaffAccount(input:ProvisionRequest,csrf:string,key:string):Promise<StaffCreation>{
 let response:Response;
 try{
  response=await fetch('/api/v1/accounts/create',{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':key},
   body:JSON.stringify(input)
  });
 }catch{throw new AccountRequestError('NETWORK_UNCERTAIN',
  'Hasil permintaan tidak diketahui. Periksa akun sebelum mencoba lagi.');}
 const body=await readBody<unknown>(response);
 if(!response.ok)
  throw new AccountRequestError(body.error?.code??'UNKNOWN_RESPONSE',
   body.error?.message??'Hasil pembuatan akun tidak dapat dipastikan.');
 const validated=validateStaffCreationResponse(body.data,input);
 if(!validated)throw new AccountRequestError('UNKNOWN_RESPONSE',
  'Hasil pembuatan akun tidak cocok dengan permintaan. Periksa akun sebelum mencoba lagi.');
 return validated;
}
