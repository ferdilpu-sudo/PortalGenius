import type { PageContext } from '../../../server/platform/context.ts';
import { failure } from '../../../server/platform/responses.ts';
export function onRequest(_context:PageContext):Response {
  return failure(crypto.randomUUID(),404,'NOT_FOUND','Endpoint tidak tersedia.');
}
