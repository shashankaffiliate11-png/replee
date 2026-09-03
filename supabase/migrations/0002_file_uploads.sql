-- NoticeDesk: file upload support
-- Adds a place to record an uploaded notice file, and a private storage
-- bucket (with folder-per-user RLS) to hold those files.
-- Run this in the Supabase SQL Editor after 0001_init.sql.

alter table public.notices
  add column if not exists notice_file_path text;

-- ── storage bucket ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notice-uploads',
  'notice-uploads',
  false, -- private: files are only reachable via signed URLs or the service role
  10485760, -- 10 MB
  array['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
on conflict (id) do nothing;

-- Files are stored under a path like "<user_id>/<uuid>-<filename>", so
-- these policies use the first path segment as the ownership check —
-- the same folder-per-user pattern Supabase's own docs recommend.

create policy "notice_uploads_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'notice-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "notice_uploads_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'notice-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "notice_uploads_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'notice-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
