import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VerifiedEnv } from './env.ts';
export function authClient(env:VerifiedEnv):SupabaseClient {
  return createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
}
export function privilegedClient(env:VerifiedEnv):SupabaseClient {
  // Never expose this client, its token, or underlying credentials to the browser.
  return createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
}
