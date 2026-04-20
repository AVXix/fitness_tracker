-- Helper functions for forum operations

create or replace function public.increment_comment_count(post_id uuid)
returns void as $$
begin
  update public.forum_posts
  set comment_count = comment_count + 1
  where id = post_id;
end;
$$ language plpgsql;

create or replace function public.update_post_votes(
  post_id uuid,
  upvote_delta integer,
  downvote_delta integer
)
returns void as $$
begin
  update public.forum_posts
  set 
    upvotes = upvotes + upvote_delta,
    downvotes = downvotes + downvote_delta
  where id = post_id;
end;
$$ language plpgsql;
