import type {PageContext} from '../../../../server/platform/context.ts';
import {hostedQaIdentity} from '../../../../server/platform/hostedQaBoundary.ts';
import {success} from '../../../../server/platform/responses.ts';

// Public identifiers only. Always 404 on Production, mismatched app origins,
// or a staging deployment still bound to the Production Supabase project.
export function onRequestGet({request,env}:PageContext):Response{
 const identity=hostedQaIdentity(env,request.url);
 if(!identity)return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
 return success(crypto.randomUUID(),identity);
}
