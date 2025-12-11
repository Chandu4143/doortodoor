-- Create a table for managing role requests
create type request_status as enum ('pending', 'approved', 'rejected');

create table if not exists role_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  requested_role text not null, -- 'owner' or 'bdm'
  status request_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table role_requests enable row level security;

-- Policies for role_requests

-- Users can view their own requests
create policy "Users can view own requests"
  on role_requests for select
  using (auth.uid() = user_id);

-- Users can create their own requests
create policy "Users can create requests"
  on role_requests for insert
  with check (auth.uid() = user_id);

-- Admins (Devs) can view all requests
-- Assuming there's a way to check if user is dev, but for now we'll allow authenticated users to view
-- Ideally this should be restricted to 'dev' role in profiles, but policies can be complex with joins.
-- For simplicity in this script, we'll rely on app-level filtering or a more complex policy if needed.
-- A simple policy allowing 'dev' role in profiles to see all:
create policy "Devs can view all requests"
  on role_requests for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'dev'
    )
  );

-- Devs can update requests (approve/reject)
create policy "Devs can update requests"
  on role_requests for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'dev'
    )
  );
