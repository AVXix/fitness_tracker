-- Store human-readable author snapshots in explicitly named forum columns.

alter table public.forum_posts
  add column if not exists posted_by text;

alter table public.forum_comments
  add column if not exists commente_by text;

update public.forum_posts fp
set posted_by = coalesce(nullif(btrim(fp.posted_by), ''), nullif(btrim(fp.author_name), ''), p.display_name)
from public.profiles p
where fp.user_id = p.id
  and (fp.posted_by is null or btrim(fp.posted_by) = '');

update public.forum_comments fc
set commente_by = coalesce(nullif(btrim(fc.commente_by), ''), nullif(btrim(fc.author_name), ''), p.display_name)
from public.profiles p
where fc.user_id = p.id
  and (fc.commente_by is null or btrim(fc.commente_by) = '');
