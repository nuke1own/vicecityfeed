-- Vice City Feed database schema.
-- Paste this whole file into the Supabase SQL editor and run it. It is safe to
-- run again: every statement is idempotent.
--
-- Auth settings (Supabase dashboard):
--   1. Authentication > Providers > Email: enable Email and allow sign-ups.
--   2. Authentication > URL Configuration: set Site URL to
--      https://www.vicecityfeed.com and add
--      https://www.vicecityfeed.com/auth/confirm/ to the redirect URLs.
--   3. Make someone staff (desk access):
--        update public.profiles set role = 'editor' where handle = 'their_handle';
--      Accounts that existed before member sign-up are backfilled as editors.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Editorial articles
-- ---------------------------------------------------------------------------

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  category text not null
    check (category in ('Leaks & News', 'Map & Lore', 'Vehicles & Guns', 'Guides')),
  section text not null
    check (section in ('wire', 'intel', 'map', 'garage', 'reviews')),
  author_name text not null,
  author_role text not null default 'Desk',
  author_handle text not null default '',
  tags text[] not null default '{}',
  cover_accent text not null default 'cyan'
    check (cover_accent in ('cyan', 'magenta', 'sunset')),
  cover_scene text not null default 'coast'
    check (
      cover_scene in (
        'coast',
        'city',
        'car',
        'map',
        'gun',
        'interior',
        'swamp',
        'port',
        'marina',
        'street',
        'club',
        'workshop',
        'portrait',
        'desk'
      )
    ),
  cover_image_url text,
  featured boolean not null default false,
  hero_rank smallint,
  breaking boolean not null default false,
  related_slugs text[] not null default '{}',
  published boolean not null default false,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists articles_published_at_idx
  on public.articles (published_at desc)
  where published = true;

create index if not exists articles_slug_published_idx
  on public.articles (slug)
  where published = true;

create or replace function public.set_articles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row
  execute procedure public.set_articles_updated_at();

grant select on table public.articles to anon;
grant select, insert, update, delete on table public.articles to authenticated;

alter table public.articles enable row level security;

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
  on public.articles for select to anon, authenticated
  using (published = true);

alter table public.articles add column if not exists cover_image_url text;
alter table public.articles add column if not exists published boolean not null default false;
alter table public.articles add column if not exists publish_pages text[] not null default '{}';

do $$
begin
  alter table public.articles drop constraint if exists articles_category_check;
  alter table public.articles
    add constraint articles_category_check
    check (category in ('Leaks & News', 'Map & Lore', 'Vehicles & Guns', 'Guides', 'Media'));
exception
  when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- Community
-- ---------------------------------------------------------------------------

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
-- Members may only edit these profile columns. role, id and timestamps are
-- never writable by members; profiles are created by handle_new_user().
revoke insert, update on public.profiles from authenticated;
grant update (handle, display_name, bio, avatar_url) on public.profiles to authenticated;
grant insert, update, delete on public.community_posts, public.post_reactions, public.profile_follows to authenticated;
grant insert on public.post_reports to authenticated;
grant select, update on public.post_reports, public.notifications to authenticated;

-- Public reads only expose visible community content.
drop policy if exists "Public can read profiles" on public.profiles;
create policy "Public can read profiles" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "Users can create their profile" on public.profiles;
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


-- ---------------------------------------------------------------------------
-- Staff-only article writes (replaces the original open policies)
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated can read all articles" on public.articles;
drop policy if exists "Authenticated can insert articles" on public.articles;
drop policy if exists "Authenticated can update articles" on public.articles;
drop policy if exists "Authenticated can delete articles" on public.articles;
drop policy if exists "Staff can read all articles" on public.articles;
create policy "Staff can read all articles" on public.articles for select to authenticated using (public.is_staff());
drop policy if exists "Staff can insert articles" on public.articles;
create policy "Staff can insert articles" on public.articles for insert to authenticated with check (public.is_staff());
drop policy if exists "Staff can update articles" on public.articles;
create policy "Staff can update articles" on public.articles for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "Staff can delete articles" on public.articles;
create policy "Staff can delete articles" on public.articles for delete to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Profiles: one per auth user, created at sign-up
-- ---------------------------------------------------------------------------

-- Handles are case-insensitive: "Lucia" and "lucia" cannot both exist.
create unique index if not exists profiles_handle_lower_idx
  on public.profiles (lower(handle));

create or replace function public.fallback_handle(user_id uuid)
returns text
language sql
immutable
as $$
  select 'user_' || substr(replace(user_id::text, '-', ''), 1, 12);
$$;

-- Creates the profile from sign-up metadata. Runs as the table owner, so the
-- member cannot choose their role. A taken or invalid handle falls back to a
-- generated one rather than failing the sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := lower(trim(coalesce(new.raw_user_meta_data ->> 'handle', '')));
  chosen text;
  name text := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if requested ~ '^[a-z0-9_]{3,24}$'
     and not exists (select 1 from public.profiles where lower(handle) = requested) then
    chosen := requested;
  else
    chosen := public.fallback_handle(new.id);
  end if;

  if char_length(name) < 1 or char_length(name) > 60 then
    name := chosen;
  end if;

  insert into public.profiles (id, handle, display_name, role)
  values (new.id, chosen, name, 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill: accounts created before member sign-up opened were desk accounts
-- (sign-up was closed), so they become editors and keep /admin access.
insert into public.profiles (id, handle, display_name, role)
select
  u.id,
  public.fallback_handle(u.id),
  left(coalesce(nullif(split_part(u.email, '@', 1), ''), 'Desk'), 60),
  'editor'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Covers: public read, staff-only writes (members can now sign up).
drop policy if exists "Public can read covers" on storage.objects;
create policy "Public can read covers" on storage.objects for select to anon, authenticated
  using (bucket_id = 'covers');
drop policy if exists "Authenticated can upload covers" on storage.objects;
drop policy if exists "Authenticated can update covers" on storage.objects;
drop policy if exists "Authenticated can delete covers" on storage.objects;
drop policy if exists "Staff can upload covers" on storage.objects;
create policy "Staff can upload covers" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.is_staff());
drop policy if exists "Staff can update covers" on storage.objects;
create policy "Staff can update covers" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.is_staff())
  with check (bucket_id = 'covers' and public.is_staff());
drop policy if exists "Staff can delete covers" on storage.objects;
create policy "Staff can delete covers" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.is_staff());

-- Avatars: public read; members write only inside their own <user id>/ folder.
drop policy if exists "Public can read avatars" on storage.objects;
create policy "Public can read avatars" on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
drop policy if exists "Members upload own avatar" on storage.objects;
create policy "Members upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Members update own avatar" on storage.objects;
create policy "Members update own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Members delete own avatar" on storage.objects;
create policy "Members delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
