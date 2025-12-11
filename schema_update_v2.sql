-- 1. TEAM ANNOUNCEMENTS
create table if not exists team_announcements (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) not null,
  content text not null,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now(),
  priority text default 'normal' -- 'normal', 'high'
);

-- RLS for Announcements
alter table team_announcements enable row level security;

create policy "Team members can view announcements"
  on team_announcements for select
  using (
    exists (
      select 1 from team_memberships
      where team_memberships.team_id = team_announcements.team_id
      and team_memberships.user_id = auth.uid()
    )
  );

create policy "Owners/BDM/Admins can create announcements"
  on team_announcements for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('owner', 'bdm', 'dev')
    )
  );

-- 2. MAPS SUPPORT
-- Add lat/lng to apartments if not exists
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'apartments' and column_name = 'latitude') then
    alter table apartments add column latitude float;
    alter table apartments add column longitude float;
  end if;
end $$;

-- Add lat/lng to business_campaigns if not exists
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'business_campaigns' and column_name = 'latitude') then
    alter table business_campaigns add column latitude float;
    alter table business_campaigns add column longitude float;
  end if;
end $$;
