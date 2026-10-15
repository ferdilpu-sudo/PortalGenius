import {masterList,masterCreate} from '../../../server/master/masterRoute.ts';
import {validateCatalog} from '../../../contracts/master/catalogValidation.ts';
import {listCatalog,createCatalog} from '../../../server/master/catalogRepository.ts';
export const onRequestGet=masterList(db=>listCatalog(db,'program'));
export const onRequestPost=masterCreate(validateCatalog,(db,input,actorId,key,requestId)=>
 createCatalog(db,'program',input,actorId,key,requestId));
