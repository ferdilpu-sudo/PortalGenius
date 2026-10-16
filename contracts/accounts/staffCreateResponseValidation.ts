import {isUUID} from '../master/academicYearValidation.ts';
import type {ProvisionRequest} from './provisionValidation.ts';

export type ValidatedStaffCreation={
 account:{id:string;username:string;displayName:string;role:ProvisionRequest['role'];
  active:true;mustChangePassword:true};
 temporaryPassword:string|null;alreadyCompleted:boolean
};

/**
 * Fail closed if a response with an uncertain write result is missing fields
 * or conflicts with what the administrator submitted. Never render an
 * unexpected secret or persist an unverified password.
 */
export function validateStaffCreationResponse(
 value:unknown,request:ProvisionRequest
):ValidatedStaffCreation|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const body=value as Record<string,unknown>;
 const account=body.account;
 if(!account||typeof account!=='object'||Array.isArray(account))return null;
 const a=account as Record<string,unknown>;
 if(typeof a.id!=='string'||!isUUID(a.id)||
  a.username!==request.username.trim().toLowerCase()||
  a.displayName!==request.displayName.trim()||
  a.role!==request.role||a.active!==true||a.mustChangePassword!==true||
  typeof body.alreadyCompleted!=='boolean')return null;
 if(body.alreadyCompleted){
  if(body.temporaryPassword!==null)return null;
 }else if(typeof body.temporaryPassword!=='string'||
  !/^[A-Za-z0-9_-]{40}$/.test(body.temporaryPassword))return null;
 return {
  account:{
   id:a.id,username:a.username as string,displayName:a.displayName as string,
   role:a.role as ProvisionRequest['role'],active:true,mustChangePassword:true
  },
  temporaryPassword:body.temporaryPassword as string|null,
  alreadyCompleted:body.alreadyCompleted
 };
}
