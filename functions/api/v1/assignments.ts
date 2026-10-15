import {masterList} from '../../../server/master/masterRoute.ts';
import {listAssignments} from '../../../server/assignments/assignmentsRepository.ts';
export const onRequestGet=masterList(listAssignments);
