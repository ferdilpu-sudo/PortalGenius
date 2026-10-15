import {masterList,masterCreate} from '../../../server/master/masterRoute.ts';
import {validateClass} from '../../../contracts/master/classValidation.ts';
import {listClasses,createClass} from '../../../server/master/classesRepository.ts';
export const onRequestGet=masterList(listClasses);
export const onRequestPost=masterCreate(validateClass,createClass);
