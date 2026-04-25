-- Store author display-name snapshots directly on forum content so names remain readable
-- without relying on a live join at render time.

alter table public.forum_posts
  add column if not exists author_name text;

alter table public.forum_comments
  add column if not exists author_name text;

update public.forum_posts fp
set author_name = p.display_name
from public.profiles p
where fp.user_id = p.id
  and (fp.author_name is null or btrim(fp.author_name) = '');

update public.forum_comments fc
set author_name = p.display_name
from public.profiles p
where fc.user_id = p.id
  and (fc.author_name is null or btrim(fc.author_name) = '');
