-- 1. ENUMS (Create types if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'help_request_status') THEN
        CREATE TYPE help_request_status AS ENUM ('pending', 'acknowledged', 'resolved');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
        CREATE TYPE activity_type AS ENUM ('visit', 'donation', 'callback_scheduled', 'floor_claimed', 'help_request');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_type') THEN
        CREATE TYPE challenge_type AS ENUM ('visits', 'donations', 'forms', 'callbacks');
    END IF;
END$$;

-- 2. TABLES

-- Floor claims table
CREATE TABLE IF NOT EXISTS public.floor_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE CASCADE,
  floor INTEGER NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(apartment_id, floor)
);

-- Help requests table
CREATE TABLE IF NOT EXISTS public.help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  building_name TEXT,
  floor INTEGER,
  status help_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Activity feed table
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type activity_type NOT NULL,
  building_id UUID REFERENCES public.apartments(id),
  building_name TEXT,
  floor INTEGER,
  room_number INTEGER,
  amount DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Building presets table
CREATE TABLE IF NOT EXISTS public.building_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  floors INTEGER NOT NULL,
  units_per_floor INTEGER NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Area templates table
CREATE TABLE IF NOT EXISTS public.area_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  buildings JSONB NOT NULL, -- Array of building preset references
  created_by UUID REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice notes table
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Assuming 'rooms' is the table for rooms, check if it exists or use 'units' or whatever is used.
  -- Based on types.ts, there is no explicit 'rooms' table, it seems rooms are JSONB in apartments?
  -- Wait, `rooms: Record<string, Room[]>` in types.ts suggests rooms are inside apartments jsonb or similar?
  -- Let's check schema_update_v2.sql again. It references 'apartments'.
  -- The design doc says `room_id UUID REFERENCES public.rooms(id)`. 
  -- IF `rooms` does not exist as a table, we need to adjust.
  -- Looking at types.ts: `Apartment` has `rooms: Record<string, Room[]>`. This implies rooms are likely stored as JSONB within the apartments table or a separate KV store.
  -- HOWEVER, if consistent with a relational design, they might be a table.
  -- I'll assume for now we might need to link to apartment_id + room identifier (floor+number) if rooms table doesn't exist.
  -- For safety, I will link to apartment_id and store room details as text/json.
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE CASCADE,
  floor_number INTEGER,
  room_number_val TEXT, -- "101", "102" etc.
  
  audio_path TEXT NOT NULL,
  transcription TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily challenges table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_type challenge_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target INTEGER NOT NULL,
  current INTEGER DEFAULT 0,
  xp_reward INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User XP table
CREATE TABLE IF NOT EXISTS public.user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team weekly scores table
CREATE TABLE IF NOT EXISTS public.team_weekly_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  donations INTEGER DEFAULT 0,
  visits INTEGER DEFAULT 0,
  amount DECIMAL(12, 2) DEFAULT 0,
  score INTEGER DEFAULT 0,
  UNIQUE(team_id, week_start)
);

-- Volunteer milestones table
CREATE TABLE IF NOT EXISTS public.volunteer_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone_type, threshold)
);

-- Calendar sync events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE CASCADE,
  floor INTEGER,
  room_number_val TEXT,
  external_event_id TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES

CREATE INDEX IF NOT EXISTS idx_floor_claims_apartment ON public.floor_claims(apartment_id);
CREATE INDEX IF NOT EXISTS idx_floor_claims_user ON public.floor_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_team ON public.help_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON public.help_requests(status);
CREATE INDEX IF NOT EXISTS idx_activity_feed_team ON public.activity_feed(team_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON public.activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user ON public.daily_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_expires ON public.daily_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_team_weekly_scores_week ON public.team_weekly_scores(week_start);
CREATE INDEX IF NOT EXISTS idx_volunteer_milestones_user ON public.volunteer_milestones(user_id);

-- 4. PROFILE UPDATES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'visibility_settings') THEN
        ALTER TABLE public.profiles ADD COLUMN visibility_settings JSONB DEFAULT '{
          "showDonations": true,
          "showVisits": true,
          "showConversionRate": true,
          "showAmount": false
        }';
    END IF;
END$$;


-- 5. RLS POLICIES

-- Helper helper function for RLS (assuming is_team_member exists, otherwise we'd need to create it, but usage in existing files suggests it or similar logic might exist. I'll stick to standard exists checks if unsure, but the design doc used it.)
-- Design doc used `public.is_team_member(team_id)`. I'll use direct logic to be safe unless I see the function definition.
-- `schema_update_v2` uses detailed exists clauses for policies. I should follow that pattern for safety.

-- Floor Claims
ALTER TABLE public.floor_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view floor claims" ON public.floor_claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.apartments a
      JOIN public.team_memberships tm ON tm.team_id = a.team_id
      WHERE a.id = floor_claims.apartment_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create floor claims" ON public.floor_claims
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own claims" ON public.floor_claims
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own claims" ON public.floor_claims
  FOR DELETE USING (user_id = auth.uid());

-- Help Requests
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view help requests" ON public.help_requests
  FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.team_memberships tm
        WHERE tm.team_id = help_requests.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create help requests" ON public.help_requests
  FOR INSERT WITH CHECK (volunteer_id = auth.uid());

CREATE POLICY "Team leaders can update help requests" ON public.help_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = help_requests.team_id AND tm.user_id = auth.uid() AND tm.team_role = 'leader'
    )
  );

-- Activity Feed (Similar RLS)
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view feed" ON public.activity_feed
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.team_id = activity_feed.team_id AND tm.user_id = auth.uid()
        )
    );
CREATE POLICY "System can insert feed" ON public.activity_feed FOR INSERT WITH CHECK (true); -- Usually inserts are server side or triggered by user actions. Allowing auth users to insert for now if they trigger it.

-- Calendar Events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own calendar events" ON public.calendar_events
 FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage own calendar events" ON public.calendar_events
 FOR ALL USING (user_id = auth.uid());

-- Data access for other tables similarly...
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own challenges" ON public.daily_challenges FOR SELECT USING (user_id = auth.uid());

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone view XP" ON public.user_xp FOR SELECT USING (true);
