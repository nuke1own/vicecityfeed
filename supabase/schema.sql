

-- Community and role-based access migration
-- Run this after the article schema above. Seed the first editor with:
--   insert into public.profiles (id, handle, display_name, role)
--   values ('AUTH_USER_UUID', 'desk', 'Vice City Feed Desk', 'editor');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[A-Za-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'moderator', 'editor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  reply_to uuid references public.community_posts(id) on delete cascade,
  quoted_article_slug text,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_created_idx
  on public.community_posts (created_at desc)
  where hidden = false;
create index if not exists community_posts_author_idx
  on public.community_posts (author_id, created_at desc);
create index if not exists community_posts_reply_idx
  on public.community_posts (reply_to, created_at asc);

create table if not exists public.post_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'repost', 'bookmark')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);

create index if not exists post_reactions_user_idx
  on public.post_reactions (user_id, created_at desc);

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'misinformation', 'copyright', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.community_posts(id) on delete cascade,
  kind text not null check (kind in ('reply', 'like', 'repost', 'follow', 'moderation')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at before update on public.community_posts
for each row execute procedure public.set_updated_at();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'editor', 'admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.profile_follows enable row level security;
alter table public.post_reports enable row level security;
alter table public.notifications enable row level security;

grant select on public.profiles, public.community_posts, public.post_reactions, public.profile_follows to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.community_posts, public.post_reactions, public.profile_follows to authenticated;
grant insert on public.post_reports to authenticated;
grant select, update on public.post_reports, public.notifications to authenticated;

-- Public reads only expose visible community content.
drop policy if exists "Public can read profiles" on public.profiles;
create policy "Public can read profiles" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "Users can create their profile" on public.profiles;
create policy "Users can create their profile" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Public can read visible posts" on public.community_posts;
create policy "Public can read visible posts" on public.community_posts for select to anon, authenticated using (hidden = false);
drop policy if exists "Members can create posts" on public.community_posts;
create policy "Members can create posts" on public.community_posts for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "Authors can update posts" on public.community_posts;
create policy "Authors can update posts" on public.community_posts for update to authenticated using (author_id = auth.uid() or public.is_staff()) with check (author_id = auth.uid() or public.is_staff());
drop policy if exists "Authors and staff can delete posts" on public.community_posts;
create policy "Authors and staff can delete posts" on public.community_posts for delete to authenticated using (author_id = auth.uid() or public.is_staff());

drop policy if exists "Users can read reactions" on public.post_reactions;
create policy "Users can read reactions" on public.post_reactions for select to anon, authenticated using (true);
drop policy if exists "Users manage own reactions" on public.post_reactions;
create policy "Users manage own reactions" on public.post_reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users read follows" on public.profile_follows;
create policy "Users read follows" on public.profile_follows for select to anon, authenticated using (true);
drop policy if exists "Users manage own follows" on public.profile_follows;
create policy "Users manage own follows" on public.profile_follows for all to authenticated using (follower_id = auth.uid()) with check (follower_id = auth.uid());

drop policy if exists "Users create reports" on public.post_reports;
create policy "Users create reports" on public.post_reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "Reporters read own reports" on public.post_reports;
create policy "Reporters read own reports" on public.post_reports for select to authenticated using (reporter_id = auth.uid() or public.is_staff());
drop policy if exists "Staff manage reports" on public.post_reports;
create policy "Staff manage reports" on public.post_reports for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select to authenticated using (recipient_id = auth.uid());
drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Replace the prototype's open article-write policies with staff-only policies.
drop policy if exists "Authenticated can read all articles" on public.articles;
drop policy if exists "Authenticated can insert articles" on public.articles;
drop policy if exists "Authenticated can update articles" on public.articles;
drop policy if exists "Authenticated can delete articles" on public.articles;
create policy "Staff can read all articles" on public.articles for select to authenticated using (public.is_staff());
create policy "Staff can insert articles" on public.articles for insert to authenticated with check (public.is_staff());
create policy "Staff can update articles" on public.articles for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff can delete articles" on public.articles for delete to authenticated using (public.is_staff());
