create table public.atlas_upload_fence (
  owner uuid primary key references auth.users(id) on delete cascade,
  blocked_until timestamptz not null default '-infinity',
  deleting boolean not null default false
);

alter table public.atlas_upload_fence enable row level security;
revoke all on public.atlas_upload_fence from public, anon, authenticated;
grant select, insert, update on public.atlas_upload_fence to service_role;

-- Serialize upload reservations and the start of deletion for each account.
create function public.atlas_upload_transition(account_id uuid, operation text) returns timestamptz
language plpgsql volatile security invoker set search_path = '' as $$
declare deadline timestamptz;
declare is_deleting boolean;
begin
  if operation is null or operation not in ('original', 'image', 'delete') then
    raise exception 'Invalid Atlas upload operation';
  end if;

  insert into public.atlas_upload_fence(owner) values (account_id)
  on conflict (owner) do nothing;

  select blocked_until, deleting into strict deadline, is_deleting
  from public.atlas_upload_fence where owner = account_id for update;

  if operation = 'delete' then
    update public.atlas_upload_fence set deleting = true where owner = account_id;
    return case when deadline > pg_catalog.clock_timestamp() then deadline else 'epoch'::timestamptz end;
  end if;
  if is_deleting then return null; end if;

  -- Signed original uploads remain valid for two hours. Reserve extra time for
  -- signing latency and in-flight writes. Image uploads use the server only.
  deadline := greatest(deadline, pg_catalog.clock_timestamp() +
    case when operation = 'original' then interval '3 hours' else interval '10 minutes' end);
  update public.atlas_upload_fence set blocked_until = deadline where owner = account_id;
  return deadline;
end;
$$;

revoke all on function public.atlas_upload_transition(uuid, text) from public, anon, authenticated;
grant execute on function public.atlas_upload_transition(uuid, text) to service_role;
