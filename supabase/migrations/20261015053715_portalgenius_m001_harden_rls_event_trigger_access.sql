-- Hardening of rls_auto_enable event-trigger function on dedicated PortalGenius database.
-- The event trigger still runs internally; public client roles cannot call its function.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
