-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLE DEFINITIONS
-- ==========================================

-- 1.1 PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  user_type TEXT CHECK (user_type IN ('mom', 'expecting', 'caregiver')),
  guidelines_accepted_at TIMESTAMP WITH TIME ZONE,
  name TEXT,
  bio TEXT CHECK (LENGTH(bio) <= 500),
  profile_photo_url TEXT,
  city TEXT,
  state TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  profile_visibility TEXT CHECK (profile_visibility IN ('public', 'matches_only', 'private')) DEFAULT 'public',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 KIDS
CREATE TABLE IF NOT EXISTS kids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  age INTEGER CHECK (age >= 0 AND age <= 18),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 USER INTERESTS
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest)
);

-- 1.4 SWIPES
CREATE TABLE IF NOT EXISTS swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  swiped_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('left', 'right')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

-- 1.5 MATCHES
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
);

-- 1.6 MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 2000),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.7 GROUPS
DO $$ BEGIN
    CREATE TYPE group_type AS ENUM ('season_of_life', 'interest_based', 'local');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('admin', 'member', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  group_type group_type NOT NULL,
  category TEXT,
  city TEXT,
  min_age INTEGER,
  max_age INTEGER,
  interest TEXT,
  cover_photo_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.8 GROUP MEMBERS
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role DEFAULT 'pending',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 1.9 GROUP MESSAGES
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES profiles(id)
);

-- ==========================================
-- 2. INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_kids_user_age ON kids(user_id, age);
CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id, interest);
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id, role);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_time ON group_messages(group_id, created_at DESC);


-- ==========================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. POLICIES
-- ==========================================

-- PROFILES Policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public profiles can be read by authenticated users" ON profiles;
CREATE POLICY "Public profiles can be read by authenticated users" ON profiles FOR SELECT USING (auth.role() = 'authenticated' AND (profile_visibility = 'public' OR id = auth.uid()));

-- KIDS Policies
DROP POLICY IF EXISTS "Users can manage own kids" ON kids;
CREATE POLICY "Users can manage own kids" ON kids FOR ALL USING (auth.uid() = user_id);

-- USER INTERESTS Policies
DROP POLICY IF EXISTS "Users can manage own interests" ON user_interests;
CREATE POLICY "Users can manage own interests" ON user_interests FOR ALL USING (auth.uid() = user_id);

-- SWIPES Policies
DROP POLICY IF EXISTS "Users can create own swipes" ON swipes;
CREATE POLICY "Users can create own swipes" ON swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);

DROP POLICY IF EXISTS "Users can read own swipes" ON swipes;
CREATE POLICY "Users can read own swipes" ON swipes FOR SELECT USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

-- MATCHES Policies
DROP POLICY IF EXISTS "Users can read own matches" ON matches;
CREATE POLICY "Users can read own matches" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create matches" ON matches;
CREATE POLICY "Users can create matches" ON matches FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- MESSAGES Policies
DROP POLICY IF EXISTS "Users can send messages to matched users" ON messages;
CREATE POLICY "Users can send messages to matched users" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM matches
      WHERE (user1_id = sender_id AND user2_id = recipient_id)
         OR (user1_id = recipient_id AND user2_id = sender_id)
    )
);

DROP POLICY IF EXISTS "Users can read their messages" ON messages;
CREATE POLICY "Users can read their messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update read status of received messages" ON messages;
CREATE POLICY "Users can update read status of received messages" ON messages FOR UPDATE USING (auth.uid() = recipient_id);

-- GROUPS Policies
DROP POLICY IF EXISTS "Anyone can read groups" ON groups;
CREATE POLICY "Anyone can read groups" ON groups FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can update their groups" ON groups;
CREATE POLICY "Admins can update their groups" ON groups FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = groups.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
);

-- GROUP MEMBERS Policies
DROP POLICY IF EXISTS "Users can read group memberships" ON group_members;
CREATE POLICY "Users can read group memberships" ON group_members FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can request to join groups" ON group_members;
CREATE POLICY "Users can request to join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'pending');

DROP POLICY IF EXISTS "Admins can manage group members" ON group_members;
CREATE POLICY "Admins can manage group members" ON group_members FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
CREATE POLICY "Users can leave groups" ON group_members FOR DELETE USING (auth.uid() = user_id);

-- GROUP MESSAGES Policies
DROP POLICY IF EXISTS "Group members can read group messages" ON group_messages;
CREATE POLICY "Group members can read group messages" ON group_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_messages.group_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'member')
    )
    AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Group members can send messages" ON group_messages;
CREATE POLICY "Group members can send messages" ON group_messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_messages.group_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'member')
    )
);

DROP POLICY IF EXISTS "Admins can soft-delete messages" ON group_messages;
CREATE POLICY "Admins can soft-delete messages" ON group_messages FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_messages.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
);

-- ==========================================
-- 6. TRIGGERS (Auto-create profile)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'user_type');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 5. SEED DATA
-- ==========================================
INSERT INTO groups (name, description, group_type, category, min_age, max_age) VALUES
  ('Expecting Moms', 'For moms-to-be to connect and share the journey', 'season_of_life', 'Expecting', NULL, NULL),
  ('Newborn (0-1yr)', 'Navigate the newborn phase together', 'season_of_life', 'Newborn', 0, 1),
  ('Toddler (1-3yr)', 'Toddler tips, tantrums, and triumphs', 'season_of_life', 'Toddler', 1, 3),
  ('Preschool (3-5yr)', 'Preschool prep and playdate planning', 'season_of_life', 'Preschool', 3, 5),
  ('School Age (5-12yr)', 'Elementary and middle school years', 'season_of_life', 'School Age', 5, 12),
  ('Teens (13-18yr)', 'Surviving and thriving through the teen years', 'season_of_life', 'Teens', 13, 18),
  ('Grown Kids (18+)', 'Empty nest and adult children', 'season_of_life', 'Grown Kids', 18, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO groups (name, description, group_type, category, interest) VALUES
  ('Working Moms', 'Balancing career and motherhood', 'interest_based', 'Working Moms', 'working_mom'),
  ('Stay-at-Home Moms', 'Full-time parenting community', 'interest_based', 'Stay-at-Home Moms', 'stay_at_home'),
  ('Homeschooling Families', 'Resources and support for homeschoolers', 'interest_based', 'Homeschooling', 'homeschooling'),
  ('Single Parents', 'Support network for single moms and dads', 'interest_based', 'Single Parents', 'single_parent'),
  ('Fitness & Wellness', 'Health-focused moms', 'interest_based', 'Fitness & Wellness', 'fitness'),
  ('Arts & Crafts', 'Creative projects and DIY ideas', 'interest_based', 'Arts & Crafts', 'arts_crafts')
ON CONFLICT (id) DO NOTHING;
