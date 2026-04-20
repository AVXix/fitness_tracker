-- Forum tables for community discussions

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.forum_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.forum_posts(id) on delete cascade,
  comment_id uuid references public.forum_comments(id) on delete cascade,
  vote_type text not null, -- 'upvote' or 'downvote'
  created_at timestamptz not null default timezone('utc', now()),
  constraint forum_votes_one_target check (
    (post_id is not null and comment_id is null) or 
    (post_id is null and comment_id is not null)
  ),
  constraint forum_votes_vote_type_valid check (vote_type in ('upvote', 'downvote')),
  unique(user_id, post_id),
  unique(user_id, comment_id)
);

-- Indexes for performance
create index if not exists forum_posts_user_id_idx on public.forum_posts(user_id);
create index if not exists forum_posts_created_at_idx on public.forum_posts(created_at desc);
create index if not exists forum_posts_upvotes_idx on public.forum_posts(upvotes desc);
create index if not exists forum_comments_post_id_idx on public.forum_comments(post_id);
create index if not exists forum_comments_user_id_idx on public.forum_comments(user_id);
create index if not exists forum_votes_user_id_idx on public.forum_votes(user_id);
