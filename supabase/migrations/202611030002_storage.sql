-- Only server-issued signed uploads/downloads can access this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('atlas-originals', 'atlas-originals', false, 15728640, array['application/octet-stream']);
