import type { PageContext } from '../../../server/platform/context.ts';
import { success } from '../../../server/platform/responses.ts';
export function onRequestGet(_context:PageContext):Response {
  return success(crypto.randomUUID(),{service:'PortalGenius API',status:'ok'});
}
