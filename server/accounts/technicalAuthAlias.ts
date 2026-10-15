import type {ProvisionRequest} from '../../contracts/accounts/provisionValidation.ts';
import {isUUID} from '../../contracts/master/academicYearValidation.ts';

// RFC 2606 .invalid is permanently reserved and cannot receive email.
// This is a non-deliverable internal Auth identifier, not a verified mailbox.
// Supabase acceptance of this domain needs separate staging verification.
export const INTERNAL_AUTH_DOMAIN='auth.portalgenius.invalid';
export type ProvisionIdentity=ProvisionRequest&{authEmail:string};

export function technicalAuthAlias(idempotencyKey:string):string{
 if(!isUUID(idempotencyKey))throw new Error('INVALID_IDEMPOTENCY_KEY');
 return 'pg-'+idempotencyKey.replaceAll('-','').toLowerCase()+'@'+INTERNAL_AUTH_DOMAIN;
}
export function withTechnicalAlias(request:ProvisionRequest,key:string):ProvisionIdentity{
 return {...request,authEmail:technicalAuthAlias(key)};
}
