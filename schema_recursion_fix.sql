-- Fix for "Infinite Recursion" in Profiles RLS
-- Run this in Supabase SQL Editor

-- 1. Create a "Security Definer" function to get the current user's role.
-- This acts as a "sudo" command, bypassing RLS to safely read the role without triggering a loop.
CREATE OR REPLACE FUNCTION public.get_my_claim_role()
RETURNS text AS $$
DECLARE
  try_role text;
BEGIN
  SELECT role::text INTO try_role FROM public.profiles
  WHERE id = auth.uid();
  RETURN try_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop potential recursive policies (guessing common names to be safe)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owner/Dev can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- 3. Re-create Safe Policies

-- A. Everyone can see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- B. Admins can view ALL profiles (using the safe function)
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  get_my_claim_role() IN ('dev', 'owner', 'bdm')
);

-- C. Users can insert/update their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 4. Fix Role Requests Policies (Use the safe function too, just in case)
DROP POLICY IF EXISTS "Devs/Owners can view requests" ON role_requests;
DROP POLICY IF EXISTS "Devs/Owners can update requests" ON role_requests;

CREATE POLICY "Devs/Owners can view requests" ON public.role_requests
FOR SELECT USING (
  get_my_claim_role() IN ('dev', 'owner')
);

CREATE POLICY "Devs/Owners can update requests" ON public.role_requests
FOR UPDATE USING (
  get_my_claim_role() IN ('dev', 'owner')
);
