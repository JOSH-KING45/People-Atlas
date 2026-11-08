alter table public.people add constraint people_owner_id_unique unique (owner,id);

create table public.atlas_tasks (
  id uuid primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  person_id uuid,
  title text not null check (length(btrim(title)) between 1 and 200),
  kind text not null check (kind in ('task','reminder','date')),
  due_on date,
  due_at timestamptz,
  completed boolean not null default false,
  google_event_id text check (length(google_event_id) between 1 and 1024),
  version integer not null default 1 check (version > 0),
  unique (owner,google_event_id),
  foreign key (owner,person_id) references public.people(owner,id) on delete set null (person_id),
  check (due_on is null or due_at is null),
  check (kind = 'task' or due_on is not null or due_at is not null),
  check (kind <> 'reminder' or due_at is not null)
);
create index atlas_tasks_owner_id on public.atlas_tasks(owner,id);
create index atlas_tasks_profile on public.atlas_tasks(owner,person_id);
alter table public.atlas_tasks enable row level security;
revoke all on public.atlas_tasks from public, anon, authenticated;
grant select, insert, update, delete on public.atlas_tasks to service_role;
