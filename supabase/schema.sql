-- ============================================================================
-- Portfolio CMS Database Schema & Strict Admin RBAC (Supabase PostgreSQL)
-- Run this entire script in the Supabase SQL Editor.
-- Safe to re-run on existing databases (idempotent).
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Admin allowlist table ---------------------------------------------------
-- Prevents any accidental self-registered user from accessing admin controls.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Users can read own admin status" on public.admin_users;
create policy "Users can read own admin status" on public.admin_users
  for select to authenticated
  using (user_id = auth.uid());

grant select on public.admin_users to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. Profile & Dynamic Site Configuration -----------------------------------
create table if not exists public.profile (
  id integer primary key check (id = 1),
  site_title text not null default 'Your Name | Cloud & DevOps Engineer',
  site_description text not null default 'Cloud infrastructure, automation, and platform engineering projects.',
  og_image_url text not null default '',
  logo_mark text not null default 'YN',
  name text not null default 'Your Name',
  short_name text not null default 'Your Name',
  brand_subtitle text not null default 'Portfolio',
  profile_image_url text not null default '',
  hero_greeting text not null default 'Hello, I’m',
  role text not null default 'Cloud & DevOps Engineer',
  availability text not null default 'Open to opportunities',
  availability_focus text not null default 'Cloud & DevOps',
  hero_description text not null default '',
  primary_label text not null default 'Explore my work',
  primary_url text not null default '#projects',
  secondary_label text not null default 'Download résumé',
  secondary_url text not null default '',
  resume_label text not null default 'Résumé',
  resume_url text not null default '',
  contact_link_label text not null default 'Get in touch',
  contact_url text not null default '#contact',
  scroll_label text not null default 'Scroll to explore',
  hero_stats jsonb not null default '[]'::jsonb,

  -- Announcement banner
  show_announcement boolean not null default false,
  announcement_badge text not null default 'New',
  announcement_text text not null default '',
  announcement_url text not null default '',

  -- Navigation customization
  nav_about_label text not null default 'About',
  nav_skills_label text not null default 'Technologies',
  nav_experience_label text not null default 'Experience',
  nav_projects_label text not null default 'Projects',
  nav_contact_label text not null default 'Contact',
  nav_custom_label text not null default '',
  nav_custom_url text not null default '',
  show_search boolean not null default true,
  show_theme_toggle boolean not null default true,
  default_theme text not null default 'dark',

  -- Skills
  skills_label text not null default 'Core technologies & infrastructure',
  skills_heading text not null default 'Tools I work with',
  skills text[] not null default '{}',

  -- About
  about_label text not null default 'A little about me',
  about_heading text not null default 'Good systems make great work possible.',
  about_intro text not null default '',
  about_quote text not null default '',
  about_quote_caption text not null default 'A principle I bring to every project',
  about text not null default '',
  about_detail text not null default '',
  about_location_label text not null default 'Based in',
  location text not null default '',
  about_response_label text not null default 'Typical response',
  response_time text not null default '',

  -- Experience & Certifications
  experience_label text not null default 'Career & impact',
  experience_heading text not null default 'Experience & credentials.',
  experience_intro text not null default '',
  experience jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,

  -- Projects section copy
  projects_label text not null default 'Selected work',
  projects_heading text not null default 'Built to work. Ready to scale.',
  projects_intro text not null default '',
  projects_search_placeholder text not null default 'Search projects or technologies…',
  projects_empty_message text not null default 'No projects match that search.',

  -- Contact section copy & labels
  contact_label text not null default 'Let’s connect',
  contact_heading text not null default 'Have a cloud challenge? Let’s talk.',
  contact_intro text not null default '',
  contact_email_label text not null default 'Direct email',
  email text not null default '',
  contact_location_label text not null default 'Location',
  contact_response_label text not null default 'Response time',
  opportunity_title text not null default '',
  opportunity_detail text not null default '',
  contact_name_label text not null default 'Full name',
  contact_email_field_label text not null default 'Email address',
  contact_subject_label text not null default 'Subject',
  contact_message_label text not null default 'Message',
  contact_submit_label text not null default 'Send a message',

  -- Social links
  github_url text not null default '',
  linkedin_url text not null default '',
  x_url text not null default '',
  website_url text not null default '',
  youtube_url text not null default '',
  custom_social_links jsonb not null default '[]'::jsonb,

  -- Footer & theme
  footer_tagline text not null default '',
  copyright_text text not null default '',
  footer_status text not null default '',
  show_admin_link boolean not null default true,
  accent_theme text not null default 'green',
  custom_accent_primary text not null default '#2de69a',
  custom_accent_secondary text not null default '#22c5e9',
  section_order text[] not null default array['skills','about','experience','projects','contact'],

  -- Section visibility toggles
  show_hero_stats boolean not null default true,
  show_about boolean not null default true,
  show_skills boolean not null default true,
  show_experience boolean not null default true,
  show_projects boolean not null default true,
  show_contact boolean not null default true,

  updated_at timestamptz not null default now()
);

alter table public.profile
  add column if not exists site_title text not null default 'Your Name | Cloud & DevOps Engineer',
  add column if not exists site_description text not null default 'Cloud infrastructure, automation, and platform engineering projects.',
  add column if not exists og_image_url text not null default '',
  add column if not exists logo_mark text not null default 'YN',
  add column if not exists name text not null default 'Your Name',
  add column if not exists short_name text not null default 'Your Name',
  add column if not exists brand_subtitle text not null default 'Portfolio',
  add column if not exists profile_image_url text not null default '',
  add column if not exists hero_greeting text not null default 'Hello, I’m',
  add column if not exists role text not null default 'Cloud & DevOps Engineer',
  add column if not exists availability text not null default 'Open to opportunities',
  add column if not exists availability_focus text not null default 'Cloud & DevOps',
  add column if not exists hero_description text not null default '',
  add column if not exists primary_label text not null default 'Explore my work',
  add column if not exists primary_url text not null default '#projects',
  add column if not exists secondary_label text not null default 'Download résumé',
  add column if not exists secondary_url text not null default '',
  add column if not exists resume_label text not null default 'Résumé',
  add column if not exists resume_url text not null default '',
  add column if not exists contact_link_label text not null default 'Get in touch',
  add column if not exists contact_url text not null default '#contact',
  add column if not exists scroll_label text not null default 'Scroll to explore',
  add column if not exists hero_stats jsonb not null default '[]'::jsonb,
  add column if not exists show_announcement boolean not null default false,
  add column if not exists announcement_badge text not null default 'New',
  add column if not exists announcement_text text not null default '',
  add column if not exists announcement_url text not null default '',
  add column if not exists nav_about_label text not null default 'About',
  add column if not exists nav_skills_label text not null default 'Technologies',
  add column if not exists nav_experience_label text not null default 'Experience',
  add column if not exists nav_projects_label text not null default 'Projects',
  add column if not exists nav_contact_label text not null default 'Contact',
  add column if not exists nav_custom_label text not null default '',
  add column if not exists nav_custom_url text not null default '',
  add column if not exists show_search boolean not null default true,
  add column if not exists show_theme_toggle boolean not null default true,
  add column if not exists default_theme text not null default 'dark',
  add column if not exists skills_label text not null default 'Core technologies & infrastructure',
  add column if not exists skills_heading text not null default 'Tools I work with',
  add column if not exists skills text[] not null default '{}',
  add column if not exists about_label text not null default 'A little about me',
  add column if not exists about_heading text not null default 'Good systems make great work possible.',
  add column if not exists about_intro text not null default '',
  add column if not exists about_quote text not null default '',
  add column if not exists about_quote_caption text not null default 'A principle I bring to every project',
  add column if not exists about text not null default '',
  add column if not exists about_detail text not null default '',
  add column if not exists about_location_label text not null default 'Based in',
  add column if not exists location text not null default '',
  add column if not exists about_response_label text not null default 'Typical response',
  add column if not exists response_time text not null default '',
  add column if not exists experience_label text not null default 'Career & impact',
  add column if not exists experience_heading text not null default 'Experience & credentials.',
  add column if not exists experience_intro text not null default '',
  add column if not exists experience jsonb not null default '[]'::jsonb,
  add column if not exists certifications jsonb not null default '[]'::jsonb,
  add column if not exists projects_label text not null default 'Selected work',
  add column if not exists projects_heading text not null default 'Built to work. Ready to scale.',
  add column if not exists projects_intro text not null default '',
  add column if not exists projects_search_placeholder text not null default 'Search projects or technologies…',
  add column if not exists projects_empty_message text not null default 'No projects match that search.',
  add column if not exists contact_label text not null default 'Let’s connect',
  add column if not exists contact_heading text not null default 'Have a cloud challenge? Let’s talk.',
  add column if not exists contact_intro text not null default '',
  add column if not exists contact_email_label text not null default 'Direct email',
  add column if not exists email text not null default '',
  add column if not exists contact_location_label text not null default 'Location',
  add column if not exists contact_response_label text not null default 'Response time',
  add column if not exists opportunity_title text not null default '',
  add column if not exists opportunity_detail text not null default '',
  add column if not exists contact_name_label text not null default 'Full name',
  add column if not exists contact_email_field_label text not null default 'Email address',
  add column if not exists contact_subject_label text not null default 'Subject',
  add column if not exists contact_message_label text not null default 'Message',
  add column if not exists contact_submit_label text not null default 'Send a message',
  add column if not exists github_url text not null default '',
  add column if not exists linkedin_url text not null default '',
  add column if not exists x_url text not null default '',
  add column if not exists website_url text not null default '',
  add column if not exists youtube_url text not null default '',
  add column if not exists custom_social_links jsonb not null default '[]'::jsonb,
  add column if not exists footer_tagline text not null default '',
  add column if not exists copyright_text text not null default '',
  add column if not exists footer_status text not null default '',
  add column if not exists show_admin_link boolean not null default true,
  add column if not exists accent_theme text not null default 'green',
  add column if not exists custom_accent_primary text not null default '#2de69a',
  add column if not exists custom_accent_secondary text not null default '#22c5e9',
  add column if not exists section_order text[] not null default array['skills','about','experience','projects','contact'],
  add column if not exists show_hero_stats boolean not null default true,
  add column if not exists show_about boolean not null default true,
  add column if not exists show_skills boolean not null default true,
  add column if not exists show_experience boolean not null default true,
  add column if not exists show_projects boolean not null default true,
  add column if not exists show_contact boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

-- 3. Projects Table ----------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default '',
  year text not null default '',
  status text not null default 'Live',
  impact text not null default '',
  description text not null default '',
  tech_stack text[] not null default '{}',
  image_url text not null default '',
  live_url text not null default '',
  github_url text not null default '',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists category text not null default '',
  add column if not exists year text not null default '',
  add column if not exists status text not null default 'Live',
  add column if not exists impact text not null default '',
  add column if not exists description text not null default '',
  add column if not exists tech_stack text[] not null default '{}',
  add column if not exists image_url text not null default '',
  add column if not exists live_url text not null default '',
  add column if not exists github_url text not null default '',
  add column if not exists is_featured boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_published boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

-- 4. Contact Messages Table --------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  email text not null check (
    char_length(email) between 3 and 254
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  subject text not null default '' check (char_length(subject) <= 160),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages
  add column if not exists subject text not null default '',
  add column if not exists is_read boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

-- 5. Row Level Security ------------------------------------------------------
alter table public.profile enable row level security;
alter table public.projects enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists "Public can read profile" on public.profile;
create policy "Public can read profile" on public.profile
  for select to anon, authenticated using (true);

drop policy if exists "Admins can manage profile" on public.profile;
create policy "Admins can manage profile" on public.profile
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects" on public.projects
  for select to anon, authenticated
  using (is_published or public.is_admin());

drop policy if exists "Admins can manage projects" on public.projects;
create policy "Admins can manage projects" on public.projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Visitors can submit contact messages" on public.contact_messages;
create policy "Visitors can submit contact messages" on public.contact_messages
  for insert to anon, authenticated
  with check (
    char_length(btrim(name)) between 1 and 100
    and char_length(email) between 3 and 254
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(btrim(message)) between 1 and 2000
    and char_length(subject) <= 160
  );

drop policy if exists "Admins can read contact messages" on public.contact_messages;
create policy "Admins can read contact messages" on public.contact_messages
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can update contact messages" on public.contact_messages;
create policy "Admins can update contact messages" on public.contact_messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete contact messages" on public.contact_messages;
create policy "Admins can delete contact messages" on public.contact_messages
  for delete to authenticated using (public.is_admin());

grant select on public.profile to anon, authenticated;
grant insert, update, delete on public.profile to authenticated;
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;

-- 6. Optional Storage Bucket for Admin Image Uploads -------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-assets',
  'portfolio-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "Public can view portfolio assets" on storage.objects;
create policy "Public can view portfolio assets" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'portfolio-assets');

drop policy if exists "Admins can upload portfolio assets" on storage.objects;
create policy "Admins can upload portfolio assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portfolio-assets' and public.is_admin());

drop policy if exists "Admins can update portfolio assets" on storage.objects;
create policy "Admins can update portfolio assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'portfolio-assets' and public.is_admin())
  with check (bucket_id = 'portfolio-assets' and public.is_admin());

drop policy if exists "Admins can delete portfolio assets" on storage.objects;
create policy "Admins can delete portfolio assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio-assets' and public.is_admin());

-- 7. Migrate legacy profile.id (e.g. uuid -> integer 1) & Seed Row --------
do $$
declare
  id_type text;
begin
  select data_type into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profile'
    and column_name = 'id';

  if id_type is not null and id_type <> 'integer' then
    alter table public.profile add column if not exists _new_id integer;
    update public.profile
    set _new_id = 1
    where ctid = (select min(ctid) from public.profile);
    delete from public.profile where _new_id is null;
    alter table public.profile drop column id cascade;
    alter table public.profile rename column _new_id to id;
    alter table public.profile alter column id set not null;
    alter table public.profile add primary key (id);
    alter table public.profile drop constraint if exists profile_id_check;
    alter table public.profile add constraint profile_id_check check (id = 1);
  end if;
end $$;

alter table public.profile
  alter column name set default 'Your Name',
  alter column role set default 'Cloud & DevOps Engineer';

insert into public.profile (id, name, role)
values (1, 'Your Name', 'Cloud & DevOps Engineer')
on conflict (id) do nothing;

-- ============================================================================
-- IMPORTANT: Grant admin access to your Supabase Auth user!
-- After creating your account in Authentication -> Users, run:
--
--   insert into public.admin_users (user_id, email)
--   select id, email from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
--   on conflict (user_id) do nothing;
-- ============================================================================
