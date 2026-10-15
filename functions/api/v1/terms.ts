import {masterList,masterCreate} from '../../../server/master/masterRoute.ts';
import {validateTerm} from '../../../contracts/master/termValidation.ts';
import {listTerms,createTerm} from '../../../server/master/termsRepository.ts';
export const onRequestGet=masterList(listTerms);
export const onRequestPost=masterCreate(validateTerm,createTerm);
