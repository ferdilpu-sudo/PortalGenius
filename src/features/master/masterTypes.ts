export type Term={id:string;yearId:string;name:string;startDate:string;endDate:string;locked:boolean;version:number};
export type CatalogKind='program'|'subject';
export type CatalogRow={id:string;code:string;name:string;archivedAt:string|null;version:number};
export type SchoolClass={id:string;yearId:string;level:'sd'|'smp'|'sma';grade:number;
 name:string;archivedAt:string|null;version:number};
