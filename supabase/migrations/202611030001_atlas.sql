-- Run once against a dedicated People Atlas Supabase project.
create table public.people (
  id uuid primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  fields jsonb not null check (jsonb_typeof(fields) = 'object'),
  notes text not null check (length(notes) <= 60000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);
create index people_owner_name on public.people(owner, lower(name));
create table public.sources (
  id uuid primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 240),
  object_key text not null unique check (object_key = owner::text || '/' || id::text),
  size integer not null check (size between 0 and 15728640),
  created_at timestamptz not null default now()
);
create index sources_owner_created on public.sources(owner, created_at desc);
create table public.settings (
  owner uuid primary key references auth.users(id) on delete cascade,
  google_client_id text not null default '',
  encrypted_ai_key text not null default '',
  ai_model text not null default 'gpt-4.1-mini',
  ai_provider text not null default 'openai'
);
alter table public.people enable row level security;
alter table public.sources enable row level security;
alter table public.settings enable row level security;
revoke all on public.people, public.sources, public.settings from public, anon, authenticated;
grant select on public.people, public.sources to authenticated;
grant select, insert, update, delete on public.people, public.sources, public.settings to service_role;
create policy read_own_people on public.people for select to authenticated using (owner = (select auth.uid()));
create policy read_own_sources on public.sources for select to authenticated using (owner = (select auth.uid()));

-- Only the application's verified server session supplies account_id.
create function public.atlas_save_people(account_id uuid, drafts jsonb)
returns setof public.people language plpgsql security invoker set search_path = '' as $$
declare draft jsonb;
begin
  if jsonb_typeof(drafts) is distinct from 'array' or jsonb_array_length(drafts) not between 1 and 200 then
    raise exception 'Invalid batch';
  end if;
  for draft in select value from jsonb_array_elements(drafts) loop
    if draft ? 'version' then
      return query update public.people p set name = draft->>'name', fields = draft->'fields',
        notes = draft->>'notes', updated_at = now(), version = p.version + 1
        where p.id = (draft->>'id')::uuid and p.owner = account_id and p.version = (draft->>'version')::integer returning p.*;
    else
      return query insert into public.people (id,owner,name,fields,notes)
        values ((draft->>'id')::uuid, account_id, draft->>'name', draft->'fields', draft->>'notes')
        on conflict(id) do nothing returning *;
    end if;
  end loop;
end;
$$;
revoke all on function public.atlas_save_people(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.atlas_save_people(uuid,jsonb) to service_role;
