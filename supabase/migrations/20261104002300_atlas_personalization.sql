-- Additive account preferences. No existing records or authentication IDs change.
create table if not exists public.atlas_preferences (
 owner uuid not null references auth.users(id) on delete cascade,
 key text not null check (key in ('profile','dashboard','tour') or key ~ '^person:[0-9a-f-]{36}$'),
 value jsonb not null check (jsonb_typeof(value) = 'object' and octet_length(value::text) <= 5000),
 primary key(owner,key)
);
alter table public.atlas_preferences enable row level security;
revoke all on public.atlas_preferences from anon, authenticated;
grant select on public.atlas_preferences to authenticated;
grant all on public.atlas_preferences to service_role;
create policy "Read own preferences" on public.atlas_preferences for select to authenticated using ((select auth.uid())=owner);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('atlas-images','atlas-images',false,2000000,array['image/jpeg'])
on conflict (id) do nothing;
-- No public Storage policies. Authenticated route handlers own upload and signed access.
