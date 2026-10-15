export function checkMasterError(error:{code?:string}|null,context:string):void{
 if(!error)return;
 if(error.code==='23505')throw new Error('MASTER_CONFLICT');
 if(error.code==='23503')throw new Error('MASTER_NOT_FOUND');
 if(error.code==='22023'||error.code==='22P02'||error.code==='23514')throw new Error('MASTER_INVALID');
 if(error.code==='42501')throw new Error('FORBIDDEN');
 throw new Error(context+'_UNAVAILABLE');
}
