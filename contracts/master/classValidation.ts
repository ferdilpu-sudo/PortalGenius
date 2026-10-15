import {isUUID} from './academicYearValidation.ts';
export type ClassInput={yearId:string;level:'sd'|'smp'|'sma';grade:number;name:string};
export function validateClass(input:unknown):ClassInput|null {
 if(!input||typeof input!=='object')return null;
 const v=input as Record<string,unknown>;
 if(typeof v.yearId!=='string'||!isUUID(v.yearId)||typeof v.level!=='string'||typeof v.name!=='string')return null;
 if(!['sd','smp','sma'].includes(v.level)||!Number.isInteger(v.grade))return null;
 const level=v.level as ClassInput['level'],grade=v.grade as number,name=v.name.trim();
 if(!(level==='sd'&&grade>=1&&grade<=6||level==='smp'&&grade>=7&&grade<=9||level==='sma'&&grade>=10&&grade<=12))return null;
 if(name.length<1||name.length>80||/[\x00-\x1F]/.test(name))return null;
 return {yearId:v.yearId,level,grade,name};
}
