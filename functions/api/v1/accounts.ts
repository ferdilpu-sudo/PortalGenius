import {masterList} from '../../../server/master/masterRoute.ts';
import {listAccounts} from '../../../server/accounts/accountsRepository.ts';
export const onRequestGet=masterList(listAccounts);
