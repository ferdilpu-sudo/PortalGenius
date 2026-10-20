import {isUUID} from '../master/academicYearValidation.ts';
export type ResetPasswordRequest={targetId:string};
export function validateResetPasswordRequest(value:unknown):ResetPasswordRequest|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const record=value as Record<string,unknown>;
 if(typeof record.targetId!=='string'||!isUUID(record.targetId)||
  Object.keys(record).some(key=>key!=='targetId'))return null;
 return {targetId:record.targetId.toLowerCase()};
}
