create table public.atlas_ai_window (slot integer primary key, used integer not null, minute timestamptz not null);
alter table public.atlas_ai_window enable row level security;
revoke all on public.atlas_ai_window from public, anon, authenticated;
grant select,insert,update on public.atlas_ai_window to service_role;
-- A single global bucket bounds use even when guests change addresses.
create function public.atlas_claim_ai_request() returns boolean
language sql volatile security invoker set search_path='' as $$
 with claimed as (
  insert into public.atlas_ai_window(slot,used,minute) values (0,1,date_trunc('minute',now()))
  on conflict(slot) do update set used=case when public.atlas_ai_window.minute <> excluded.minute then 1 else public.atlas_ai_window.used + 1 end, minute=excluded.minute
  where public.atlas_ai_window.minute <> excluded.minute or public.atlas_ai_window.used < 5 returning 1
 ) select exists(select from claimed);
$$;
revoke all on function public.atlas_claim_ai_request() from public, anon, authenticated;
grant execute on function public.atlas_claim_ai_request() to service_role;
