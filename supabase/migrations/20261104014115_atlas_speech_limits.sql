create table public.atlas_speech_window (
 period text primary key check (period in ('minute','hour','day')),
 started_at timestamptz not null,
 used_seconds integer not null check (used_seconds>=0),
 requests integer not null check (requests>=0)
);
alter table public.atlas_speech_window enable row level security;
revoke all on public.atlas_speech_window from public,anon,authenticated;
grant select,insert,update on public.atlas_speech_window to service_role;
create function public.atlas_claim_speech_request(audio_seconds integer) returns boolean
language plpgsql volatile security invoker set search_path='' as $$
declare p text; stamp timestamptz; used integer; calls integer;
begin
 if audio_seconds<10 or audio_seconds>90 or audio_seconds is null then return false; end if;
 perform pg_catalog.pg_advisory_xact_lock(70144115);
 foreach p in array array['minute','hour','day'] loop
  stamp:=pg_catalog.date_trunc(p,pg_catalog.now());
  select used_seconds,requests into used,calls from public.atlas_speech_window where period=p and started_at=stamp;
  used:=coalesce(used,0);calls:=coalesce(calls,0);
  if (p='minute' and calls>=10) or (p='hour' and used+audio_seconds>6000) or (p='day' and used+audio_seconds>24000) then return false; end if;
 end loop;
 foreach p in array array['minute','hour','day'] loop
  stamp:=pg_catalog.date_trunc(p,pg_catalog.now());
  insert into public.atlas_speech_window(period,started_at,used_seconds,requests) values(p,stamp,audio_seconds,1)
  on conflict(period) do update set used_seconds=case when public.atlas_speech_window.started_at=excluded.started_at then public.atlas_speech_window.used_seconds+excluded.used_seconds else excluded.used_seconds end, requests=case when public.atlas_speech_window.started_at=excluded.started_at then public.atlas_speech_window.requests+1 else 1 end,started_at=excluded.started_at;
 end loop;
 return true;
end;
$$;
revoke all on function public.atlas_claim_speech_request(integer) from public,anon,authenticated;
grant execute on function public.atlas_claim_speech_request(integer) to service_role;
