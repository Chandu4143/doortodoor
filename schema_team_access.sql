-- Allow authenticated users to view teams
-- This is necessary so they can find a team by its code to join it.
-- Without this, query for "team_code" returns null for non-members, causing "Invalid team code" error.

-- 1. Check if RLS is enabled (it should be, but good to be safe)
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if it exists to avoid conflicts (in case of re-running)
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;

-- 3. Create the policy
-- We allow ANY authenticated user to SELECT from teams.
-- This exposes team names/codes/descriptions to all logged-in users.
-- This is acceptable for this feature requirements (Open Team Codes).
CREATE POLICY "Authenticated users can view teams" 
ON public.teams 
FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- Note: We do NOT allow INSERT/UPDATE/DELETE with this policy.
-- Creation is restricted to specific roles in other policies (or should be).
