import {masterList} from '../../../server/master/masterRoute.ts';
import {listTeachers} from '../../../server/teachers/teachersRepository.ts';
export const onRequestGet=masterList(listTeachers);
