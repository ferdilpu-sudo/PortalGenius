// Academic years are inclusive start/end dates in the local school calendar.
export type AcademicYearInput={label:string;startDate:string;endDate:string};
export function isValidISODate(input:unknown):input is string {
  if(typeof input!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input))return false;
  const dt=new Date(input+'T00:00:00.000Z');
  return !Number.isNaN(dt.getTime())&&dt.toISOString().slice(0,10)===input;
}
export function validateAcademicYear(input:unknown):AcademicYearInput|null {
  if(!input||typeof input!=='object')return null;
  const value=input as Record<string,unknown>;
  if(typeof value.label!=='string')return null;
  const label=value.label.trim();
  if(label.length<3||label.length>40||/\p{Cc}/u.test(label))return null;
  if(!isValidISODate(value.startDate)||!isValidISODate(value.endDate))return null;
  if(value.startDate<'2000-01-01'||value.endDate>'2100-12-31'||value.startDate>value.endDate)return null;
  return {label,startDate:value.startDate,endDate:value.endDate};
}
export function isUUID(value:string|null):boolean {
  return !!value&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
