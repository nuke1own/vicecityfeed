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

-- ---------------------------------------------------------------------------
-- Account deletion (Settings > Profile > Delete account)
-- ---------------------------------------------------------------------------

-- Deletes the calling user only. Their profile, posts, reactions, follows and
-- notifications go with it through on-delete-cascade foreign keys. The app
-- removes their avatar files from Storage first.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from public.post_reports where reporter_id = uid;
  update public.post_reports set reviewed_by = null where reviewed_by = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Preferences (Settings > Preferences)
-- ---------------------------------------------------------------------------

-- Colour theme id from lib/themes.ts. Null means the site default.
alter table public.profiles add column if not exists theme text;
do $$
begin
  alter table public.profiles drop constraint if exists profiles_theme_check;
  alter table public.profiles
    add constraint profiles_theme_check check (theme is null or theme ~ '^[a-z-]{1,24}$');
end $$;
grant update (theme) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Preset avatars only (public/avatars/*.webp, listed in lib/avatars.ts)
-- ---------------------------------------------------------------------------

-- Clear photos uploaded before avatars became preset-only.
update public.profiles
set avatar_url = null
where avatar_url is not null and avatar_url !~ '^/avatars/[a-z0-9-]{1,40}\.webp$';

do $$
begin
  alter table public.profiles drop constraint if exists profiles_avatar_url_check;
  alter table public.profiles
    add constraint profiles_avatar_url_check
    check (avatar_url is null or avatar_url ~ '^/avatars/[a-z0-9-]{1,40}\.webp$');
end $$;

-- Members can no longer upload files; they may still delete their old ones.
drop policy if exists "Members upload own avatar" on storage.objects;
drop policy if exists "Members update own avatar" on storage.objects;

-- ---------------------------------------------------------------------------
-- Social: posts, replies, likes and follows (X-style community)
-- ---------------------------------------------------------------------------

-- Posts are short, like X. The app enforces 280; the database allows a little headroom.
do $$
begin
  alter table public.community_posts drop constraint if exists community_posts_body_check;
  alter table public.community_posts drop constraint if exists community_posts_body_length;
  alter table public.community_posts
    add constraint community_posts_body_length check (char_length(btrim(body)) between 1 and 500);
end $$;

-- Staff can see hidden posts so they can review and restore them.
drop policy if exists "Staff read all posts" on public.community_posts;
create policy "Staff read all posts" on public.community_posts for select to authenticated
  using (public.is_staff());

-- Authors cannot edit or un-hide posts; only staff can update (moderation).
drop policy if exists "Authors can update posts" on public.community_posts;
drop policy if exists "Staff can update posts" on public.community_posts;
create policy "Staff can update posts" on public.community_posts for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Simple spam guard: at most 5 posts per minute per member.
create or replace function public.limit_post_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.community_posts
      where author_id = new.author_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Too many posts. Wait a minute.';
  end if;
  return new;
end;
$$;
drop trigger if exists community_posts_rate_limit on public.community_posts;
create trigger community_posts_rate_limit before insert on public.community_posts
  for each row execute procedure public.limit_post_rate();

-- Replies must point at a visible post.
create or replace function public.check_reply_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reply_to is not null and not exists (
    select 1 from public.community_posts where id = new.reply_to and hidden = false
  ) then
    raise exception 'reply_target_missing' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists community_posts_reply_target on public.community_posts;
create trigger community_posts_reply_target before insert on public.community_posts
  for each row execute procedure public.check_reply_target();

-- Only "like" reactions are used for now.
grant select on public.post_reactions to anon, authenticated;



create index if not exists post_reactions_post_idx on public.post_reactions (post_id, reaction);
create index if not exists profile_follows_following_idx on public.profile_follows (following_id);

-- ---------------------------------------------------------------------------
-- Messages: private one-to-one conversations
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at desc);

-- Membership check that bypasses RLS, so policies do not recurse.
create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation and user_id = auth.uid()
  );
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations, public.conversation_members, public.messages from anon;
grant select on public.conversations, public.conversation_members, public.messages to authenticated;
grant insert on public.messages to authenticated;
revoke update on public.conversation_members from authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;

drop policy if exists "Members read conversations" on public.conversations;
create policy "Members read conversations" on public.conversations for select to authenticated
  using (public.is_conversation_member(id));

drop policy if exists "Members read membership" on public.conversation_members;
create policy "Members read membership" on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));
drop policy if exists "Members mark read" on public.conversation_members;
create policy "Members mark read" on public.conversation_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Members read messages" on public.messages;
create policy "Members read messages" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
drop policy if exists "Members send messages" on public.messages;
create policy "Members send messages" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));

-- After a message: bump the conversation and mark it read for the sender.
create or replace function public.after_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end;
$$;
drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute procedure public.after_message_insert();

-- Spam guard: at most 30 messages per minute per member.
create or replace function public.limit_message_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages
  for each row execute procedure public.limit_message_rate();

-- Find or create the one-to-one conversation with another member.
create or replace function public.start_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  found uuid;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if p_other is null or p_other = me then
    raise exception 'invalid_recipient' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    raise exception 'invalid_recipient' using errcode = 'P0001';
  end if;

  select a.conversation_id into found
  from public.conversation_members a
  join public.conversation_members b on b.conversation_id = a.conversation_id and b.user_id = p_other
  where a.user_id = me
    and (select count(*) from public.conversation_members c where c.conversation_id = a.conversation_id) = 2
  limit 1;

  if found is not null then
    return found;
  end if;

  insert into public.conversations default values returning id into found;
  insert into public.conversation_members (conversation_id, user_id) values (found, me), (found, p_other);
  return found;
end;
$$;
revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

-- Inbox: one row per conversation with the other person and the latest message.
create or replace function public.get_inbox()
returns table (
  conversation_id uuid,
  last_message_at timestamptz,
  other_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  last_body text,
  last_sender_id uuid,
  unread boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.last_message_at,
    other.user_id,
    p.handle,
    p.display_name,
    p.avatar_url,
    last.body,
    last.sender_id,
    (last.created_at is not null and last.created_at > mine.last_read_at and last.sender_id <> auth.uid())
  from public.conversation_members mine
  join public.conversations c on c.id = mine.conversation_id
  join public.conversation_members other on other.conversation_id = c.id and other.user_id <> mine.user_id
  join public.profiles p on p.id = other.user_id
  left join lateral (
    select m.body, m.sender_id, m.created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) last on true
  where mine.user_id = auth.uid()
  order by c.last_message_at desc
  limit 100;
$$;
grant execute on function public.get_inbox() to authenticated;

create or replace function public.unread_conversation_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::int from public.get_inbox() where unread;
$$;
grant execute on function public.unread_conversation_count() to authenticated;

-- Live updates for open conversations (Supabase Realtime; RLS still applies).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Trending hashtags from the last few days of visible posts (Social sidebar).
create or replace function public.trending_hashtags(p_days integer default 7, p_limit integer default 8)
returns table (tag text, posts bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select lower(m[1]) as tag, count(distinct p.id) as posts
  from public.community_posts p,
       regexp_matches(p.body, '#([A-Za-z0-9_]{2,30})', 'g') as m
  where p.hidden = false
    and p.created_at > now() - make_interval(days => least(greatest(p_days, 1), 30))
  group by lower(m[1])
  order by posts desc, tag
  limit least(greatest(p_limit, 1), 20);
$$;
grant execute on function public.trending_hashtags(integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Social, part 2: notifications, bookmarks, top creators, live timeline
-- ---------------------------------------------------------------------------

-- Notifications also cover @mentions.
do $$
begin
  alter table public.notifications drop constraint if exists notifications_kind_check;
  alter table public.notifications
    add constraint notifications_kind_check
    check (kind in ('reply', 'like', 'repost', 'follow', 'mention', 'moderation'));
end $$;

-- Members may only mark their notifications read; triggers create them.
revoke insert, update, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id) where read_at is null;

create or replace function public.notify(p_recipient uuid, p_actor uuid, p_post uuid, p_kind text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (recipient_id, actor_id, post_id, kind)
  select p_recipient, p_actor, p_post, p_kind
  where p_recipient is not null and p_recipient <> p_actor;
$$;
revoke all on function public.notify(uuid, uuid, uuid, text) from public, anon, authenticated;

create or replace function public.notify_on_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author uuid;
  mentioned uuid;
begin
  if new.reply_to is not null then
    select author_id into parent_author from public.community_posts where id = new.reply_to;
    perform public.notify(parent_author, new.author_id, new.id, 'reply');
  end if;
  for mentioned in
    select distinct pr.id
    from regexp_matches(new.body, '@([A-Za-z0-9_]{3,24})', 'g') as m
    join public.profiles pr on pr.handle = lower(m[1])
    where pr.id is distinct from parent_author
    limit 10
  loop
    perform public.notify(mentioned, new.author_id, new.id, 'mention');
  end loop;
  return new;
end;
$$;
drop trigger if exists community_posts_notify on public.community_posts;
create trigger community_posts_notify after insert on public.community_posts
  for each row execute procedure public.notify_on_post();

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.reaction = 'like' then
    perform public.notify((select author_id from public.community_posts where id = new.post_id), new.user_id, new.post_id, 'like');
  elsif tg_op = 'DELETE' and old.reaction = 'like' then
    delete from public.notifications
    where kind = 'like' and post_id = old.post_id and actor_id = old.user_id and read_at is null;
  end if;
  return null;
end;
$$;
drop trigger if exists post_reactions_notify on public.post_reactions;
create trigger post_reactions_notify after insert or delete on public.post_reactions
  for each row execute procedure public.notify_on_like();

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify(new.following_id, new.follower_id, null, 'follow');
  return new;
end;
$$;
drop trigger if exists profile_follows_notify on public.profile_follows;
create trigger profile_follows_notify after insert on public.profile_follows
  for each row execute procedure public.notify_on_follow();

create or replace function public.get_notifications(p_limit integer default 50)
returns table (
  id uuid,
  kind text,
  created_at timestamptz,
  read boolean,
  post_id uuid,
  post_body text,
  actor_handle text,
  actor_name text,
  actor_avatar text
)
language sql
stable
security invoker
set search_path = public
as $$
  select n.id, n.kind, n.created_at, n.read_at is not null,
         n.post_id, left(p.body, 140), a.handle, a.display_name, a.avatar_url
  from public.notifications n
  left join public.profiles a on a.id = n.actor_id
  left join public.community_posts p on p.id = n.post_id
  where n.recipient_id = auth.uid()
  order by n.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;
grant execute on function public.get_notifications(integer) to authenticated;

create or replace function public.unread_notification_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::int from public.notifications where recipient_id = auth.uid() and read_at is null;
$$;
grant execute on function public.unread_notification_count() to authenticated;

-- Bookmarks are private: everyone sees likes, only you see your bookmarks.
drop policy if exists "Users can read reactions" on public.post_reactions;
create policy "Users can read reactions" on public.post_reactions for select to anon, authenticated
  using (reaction <> 'bookmark' or user_id = auth.uid());



-- Most active members this week (posts plus likes received).
create or replace function public.top_creators(p_days integer default 7, p_limit integer default 5)
returns table (id uuid, handle text, display_name text, avatar_url text, role text, posts bigint, likes bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select pr.id, pr.handle, pr.display_name, pr.avatar_url, pr.role,
         count(distinct p.id) as posts,
         count(r.post_id) filter (where r.reaction = 'like') as likes
  from public.community_posts p
  join public.profiles pr on pr.id = p.author_id
  left join public.post_reactions r on r.post_id = p.id
  where p.hidden = false
    and p.created_at > now() - make_interval(days => least(greatest(p_days, 1), 30))
  group by pr.id
  order by count(distinct p.id) + count(r.post_id) filter (where r.reaction = 'like') desc, pr.handle
  limit least(greatest(p_limit, 1), 10);
$$;
grant execute on function public.top_creators(integer, integer) to anon, authenticated;

-- Live "new posts" banner on the timeline (Realtime; RLS still applies).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_posts'
     ) then
    alter publication supabase_realtime add table public.community_posts;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Moderation (Social > Moderation, staff only)
-- ---------------------------------------------------------------------------

-- One row per reported post that still needs a decision, newest report first.
create or replace function public.get_report_queue(p_status text default 'open')
returns table (
  post_id uuid,
  body text,
  hidden boolean,
  post_created_at timestamptz,
  author_handle text,
  author_name text,
  report_count bigint,
  reasons text[],
  last_reported_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.body, p.hidden, p.created_at, a.handle, a.display_name,
         count(r.id), array_agg(distinct r.reason), max(r.created_at)
  from public.post_reports r
  join public.community_posts p on p.id = r.post_id
  join public.profiles a on a.id = p.author_id
  where public.is_staff()
    and r.status = case when p_status = 'resolved' then 'resolved' else 'open' end
  group by p.id, a.handle, a.display_name
  order by max(r.created_at) desc
  limit 100;
$$;
grant execute on function public.get_report_queue(text) to authenticated;

-- Staff decisions on a post: hide (and tell the author), restore, or dismiss reports.
create or replace function public.moderate_post(p_post uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  author uuid;
begin
  if not public.is_staff() then
    raise exception 'not_staff' using errcode = '42501';
  end if;
  select author_id into author from public.community_posts where id = p_post;
  if author is null then
    raise exception 'post_missing' using errcode = 'P0001';
  end if;

  if p_action = 'hide' then
    update public.community_posts set hidden = true where id = p_post;
    update public.post_reports set status = 'resolved', reviewed_by = auth.uid(), reviewed_at = now()
      where post_id = p_post and status in ('open', 'reviewing');
    perform public.notify(author, auth.uid(), p_post, 'moderation');
  elsif p_action = 'restore' then
    update public.community_posts set hidden = false where id = p_post;
  elsif p_action = 'dismiss' then
    update public.post_reports set status = 'dismissed', reviewed_by = auth.uid(), reviewed_at = now()
      where post_id = p_post and status in ('open', 'reviewing');
  else
    raise exception 'unknown_action' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.moderate_post(uuid, text) from public, anon;
grant execute on function public.moderate_post(uuid, text) to authenticated;

create or replace function public.open_report_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select case when public.is_staff()
    then (select count(distinct post_id)::int from public.post_reports where status = 'open')
    else 0 end;
$$;
grant execute on function public.open_report_count() to authenticated;

-- ---------------------------------------------------------------------------
-- Post images and polls
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read post images" on storage.objects;
create policy "Public can read post images" on storage.objects for select to anon, authenticated
  using (bucket_id = 'post-images');
drop policy if exists "Members upload own post images" on storage.objects;
create policy "Members upload own post images" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Members delete own post images" on storage.objects;
create policy "Members delete own post images" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  url text not null check (url ~ '^https?://[^ ]+/storage/v1/object/public/post-images/'),
  alt text not null check (char_length(btrim(alt)) between 1 and 420),
  width integer check (width between 1 and 10000),
  height integer check (height between 1 and 10000),
  position smallint not null default 0 check (position between 0 and 3),
  created_at timestamptz not null default now(),
  unique (post_id, position)
);

create table if not exists public.polls (
  post_id uuid primary key references public.community_posts(id) on delete cascade,
  options text[] not null check (
    array_length(options, 1) between 2 and 4
    and array_position(options, null) is null
  ),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_votes (
  post_id uuid not null references public.polls(post_id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index smallint not null check (option_index between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_images enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

grant select on public.post_images, public.polls to anon, authenticated;
grant insert on public.post_images, public.polls, public.poll_votes to authenticated;
-- anon needs the grant for post_feed's "myVote" lookup; with no anon policy it sees no rows.
grant select on public.poll_votes to anon, authenticated;

-- Images and polls are visible when their post is; only the post's author can add them.
drop policy if exists "Read images of visible posts" on public.post_images;
create policy "Read images of visible posts" on public.post_images for select to anon, authenticated
  using (exists (select 1 from public.community_posts p where p.id = post_id and (p.hidden = false or public.is_staff())));
drop policy if exists "Authors add images" on public.post_images;
create policy "Authors add images" on public.post_images for insert to authenticated
  with check (exists (select 1 from public.community_posts p where p.id = post_id and p.author_id = auth.uid()));

drop policy if exists "Read polls of visible posts" on public.polls;
create policy "Read polls of visible posts" on public.polls for select to anon, authenticated
  using (exists (select 1 from public.community_posts p where p.id = post_id and (p.hidden = false or public.is_staff())));
drop policy if exists "Authors add polls" on public.polls;
create policy "Authors add polls" on public.polls for insert to authenticated
  with check (
    exists (select 1 from public.community_posts p where p.id = post_id and p.author_id = auth.uid())
    and ends_at > now() and ends_at <= now() + interval '7 days 1 hour'
  );

-- Who voted for what is private: you only see your own vote.
drop policy if exists "Members see own votes" on public.poll_votes;
create policy "Members see own votes" on public.poll_votes for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Members vote once" on public.poll_votes;
create policy "Members vote once" on public.poll_votes for insert to authenticated
  with check (user_id = auth.uid());

-- Votes must be for a real option of an open poll on a visible post.
create or replace function public.check_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  poll public.polls;
begin
  select * into poll from public.polls where post_id = new.post_id;
  if poll.post_id is null or poll.ends_at <= now() then
    raise exception 'poll_closed' using errcode = 'P0001';
  end if;
  if new.option_index >= array_length(poll.options, 1) then
    raise exception 'invalid_option' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.community_posts where id = new.post_id and hidden = false) then
    raise exception 'poll_closed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists poll_votes_check on public.poll_votes;
create trigger poll_votes_check before insert on public.poll_votes
  for each row execute procedure public.check_poll_vote();

-- No more than 4 images per post.
create or replace function public.limit_post_images()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.post_images where post_id = new.post_id) >= 4 then
    raise exception 'too_many_images' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists post_images_limit on public.post_images;
create trigger post_images_limit before insert on public.post_images
  for each row execute procedure public.limit_post_images();

-- Vote totals per option (counts everyone's votes, reveals no one's choice).
create or replace function public.poll_counts(p_post uuid)
returns integer[]
language sql
stable
security definer
set search_path = public
as $$
  select array_agg(
    (select count(*)::int from public.poll_votes v where v.post_id = p_post and v.option_index = g.i)
    order by g.i)
  from public.polls pl, generate_series(0, array_length(pl.options, 1) - 1) as g(i)
  where pl.post_id = p_post;
$$;
grant execute on function public.poll_counts(uuid) to anon, authenticated;

create index if not exists post_images_post_idx on public.post_images (post_id, position);

-- ---------------------------------------------------------------------------
-- Timeline view (defined last: it reads images, polls and votes)
-- ---------------------------------------------------------------------------

-- Timeline rows with author, counts and whether the viewer liked the post.
-- security_invoker: RLS of the person asking applies (hidden posts stay hidden).
create or replace view public.post_feed with (security_invoker = true) as
select
  p.id,
  p.body,
  p.created_at,
  p.reply_to,
  p.author_id,
  pr.handle,
  pr.display_name,
  pr.avatar_url,
  pr.role,
  (select count(*) from public.post_reactions r where r.post_id = p.id and r.reaction = 'like') as like_count,
  (select count(*) from public.community_posts c where c.reply_to = p.id and c.hidden = false) as reply_count,
  exists (
    select 1 from public.post_reactions r
    where r.post_id = p.id and r.reaction = 'like' and r.user_id = auth.uid()
  ) as liked,
  exists (
    select 1 from public.post_reactions r
    where r.post_id = p.id and r.reaction = 'bookmark' and r.user_id = auth.uid()
  ) as bookmarked,
  coalesce((
    select json_agg(json_build_object('url', i.url, 'alt', i.alt, 'width', i.width, 'height', i.height) order by i.position)
    from public.post_images i where i.post_id = p.id
  ), '[]'::json) as images,
  (
    select json_build_object(
      'options', pl.options,
      'endsAt', pl.ends_at,
      'counts', public.poll_counts(p.id),
      'myVote', (select v.option_index from public.poll_votes v where v.post_id = p.id and v.user_id = auth.uid())
    )
    from public.polls pl where pl.post_id = p.id
  ) as poll
from public.community_posts p
join public.profiles pr on pr.id = p.author_id
where p.hidden = false;
grant select on public.post_feed to anon, authenticated;
