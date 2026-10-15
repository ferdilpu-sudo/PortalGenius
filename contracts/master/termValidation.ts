import {isUUID,isValidISODate} from './academicYearValidation.ts';
export type TermInput={yearId:string;name:string;startDate:string;endDate:string};
export function validateTerm(input:unknown):TermInput|null {
 if(!input||typeof input!=='object')return null;
 const v=input as Record<string,unknown>;
 if(typeof v.yearId!=='string'||!isUUID(v.yearId)||typeof v.name!=='string')return null;
 const name=v.name.trim();
 if(!name||name.length>40||/[\x00-\x1F]/.test(name))return null;
 if(!isValidISODate(v.startDate)||!isValidISODate(v.endDate)||v.startDate>v.endDate)return null;
 return {yearId:v.yearId,name,startDate:v.startDate,endDate:v.endDate};
}
