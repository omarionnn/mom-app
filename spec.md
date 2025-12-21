# Mom Connect - Technical Specification

## Overview
A mobile-first social platform connecting mothers through matching, messaging, and community groups. Built with Expo (React Native) for cross-platform mobile deployment, Supabase for backend services, and focused on creating meaningful local connections.

## Tech Stack

### Frontend
- **Framework**: Expo (React Native)
- **Platform**: iOS & Android (cross-platform)
- **UI Components**: React Native base components (Antigravity handles design)
- **Navigation**: React Navigation
- **State Management**: React Context API / Zustand (lightweight)

### Backend
- **BaaS**: Supabase
  - Authentication (email/password)
  - PostgreSQL database
  - Real-time subscriptions
  - Storage (profile photos, group images)
  - Row Level Security (RLS) policies

### External APIs
- **Google Places API**: Local resource discovery
- **Expo Location**: Device GPS for city-level matching

### Testing
- **Unit Tests**: Jest
- **Component Tests**: React Native Testing Library
- **Test Strategy**: Unit tests after each feature, integration tests after multiple features

### Deployment
- **Mobile**: Expo Application Services (EAS)
- **Future Web Admin**: Vercel (Phase 2+)

---

## MVP Features (Phase 1)

### Phase 1A: Foundation
1. Authentication System
2. User Profiles & Onboarding

### Phase 1B: Matching
3. Mom Matching (Swipe Interface)
4. One-on-One Messaging

### Phase 1C: Community
5. Group Discovery & Joining
6. Group Chat

---

## Detailed Feature Specifications

## FEATURE 1: Authentication System

### Requirements
- Email/password authentication via Supabase Auth
- Honor system for user verification (self-identification as mom/caregiver)
- Community guidelines acceptance during signup
- Secure session management

### User Flow
1. User opens app
2. Presented with Sign Up / Sign In options
3. **Sign Up**:
   - Enter email
   - Create password (min 8 characters)
   - Verify email via Supabase email confirmation
   - Accept community guidelines (checkbox)
   - Self-identify as: Mom / Expecting / Caregiver
4. **Sign In**:
   - Enter email & password
   - Access account

### Technical Implementation

#### Database Schema
```sql
-- Supabase Auth handles users table
-- Extended user profile in custom table

CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  user_type TEXT CHECK (user_type IN ('mom', 'expecting', 'caregiver')),
  guidelines_accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

#### Key Functions
```typescript
// auth.service.ts
interface SignUpData {
  email: string;
  password: string;
  userType: 'mom' | 'expecting' | 'caregiver';
  guidelinesAccepted: boolean;
}

async function signUp(data: SignUpData): Promise<AuthResult>
async function signIn(email: string, password: string): Promise<AuthResult>
async function signOut(): Promise<void>
async function getCurrentUser(): Promise<User | null>
```

#### Validation Rules
- Email: Valid email format
- Password: Minimum 8 characters, at least 1 number
- Guidelines: Must be accepted (true)
- User type: Must be one of enum values

### Unit Tests
```typescript
describe('Authentication Service', () => {
  test('should successfully sign up new user with valid data')
  test('should reject signup with invalid email')
  test('should reject signup with weak password')
  test('should reject signup without guidelines acceptance')
  test('should successfully sign in with correct credentials')
  test('should reject sign in with incorrect password')
  test('should successfully sign out user')
  test('should retrieve current authenticated user')
})
```

### Acceptance Criteria
- [ ] User can create account with email/password
- [ ] Email verification sent via Supabase
- [ ] User type selection works (mom/expecting/caregiver)
- [ ] Community guidelines must be accepted
- [ ] User can sign in with credentials
- [ ] User can sign out
- [ ] Session persists on app restart
- [ ] All unit tests pass

---

## FEATURE 2: User Profiles & Onboarding

### Requirements
- Multi-step profile setup after initial authentication
- Collect: kids' ages, interests, location (city-level via GPS)
- Profile photo upload
- Privacy settings for profile visibility
- Profile editing capability

### User Flow
1. After email verification, user redirected to onboarding
2. **Step 1: Kids' Information**
   - Add one or more kids
   - For each: Age (dropdown or number input)
   - Skip option for expecting moms
3. **Step 2: Interests**
   - Multi-select from predefined list:
     - Working mom
     - Stay-at-home mom
     - Homeschooling
     - Single parent
     - Fitness & wellness
     - Arts & crafts
     - Outdoor activities
     - Book club
     - Cooking/baking
     - Career-focused
     - [Custom text input for "Other"]
4. **Step 3: Location**
   - Request GPS permission
   - Auto-detect city via reverse geocoding
   - Allow manual city entry if GPS declined
   - Store: city name, state, lat/lng coordinates
5. **Step 4: Profile Photo & Bio**
   - Upload profile photo (optional but encouraged)
   - Write short bio (max 500 characters)
6. **Step 5: Privacy Settings**
   - Profile visibility options:
     - Public (visible to all moms)
     - Matches only (only visible to matched moms)
     - Private (not discoverable, can only join groups)
   - Can change later in settings

### Technical Implementation

#### Database Schema
```sql
CREATE TABLE profiles (
  -- ... existing fields from Feature 1
  name TEXT NOT NULL,
  bio TEXT CHECK (LENGTH(bio) <= 500),
  profile_photo_url TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  profile_visibility TEXT CHECK (profile_visibility IN ('public', 'matches_only', 'private')) DEFAULT 'public',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE kids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  age INTEGER CHECK (age >= 0 AND age <= 18),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest)
);

-- RLS Policies
ALTER TABLE kids ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own kids"
  ON kids FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own interests"
  ON user_interests FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public profiles can be read by authenticated users"
  ON profiles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND 
    (profile_visibility = 'public' OR id = auth.uid())
  );
```

#### Key Functions
```typescript
// profile.service.ts
interface ProfileData {
  name: string;
  bio?: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  profileVisibility: 'public' | 'matches_only' | 'private';
}

interface Kid {
  age: number;
}

async function updateProfile(userId: string, data: ProfileData): Promise<Profile>
async function addKids(userId: string, kids: Kid[]): Promise<Kid[]>
async function addInterests(userId: string, interests: string[]): Promise<void>
async function uploadProfilePhoto(userId: string, imageUri: string): Promise<string>
async function getProfile(userId: string): Promise<Profile>
async function completeOnboarding(userId: string): Promise<void>

// location.service.ts
async function requestLocationPermission(): Promise<boolean>
async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }>
async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; state: string }>
```

#### Validation Rules
- Name: 2-50 characters
- Bio: Max 500 characters
- Kids: Age 0-18
- Interests: At least 1 selected
- Location: Valid city/state or GPS coordinates
- Profile photo: Max 5MB, formats: jpg, png

### Unit Tests
```typescript
describe('Profile Service', () => {
  test('should create profile with valid data')
  test('should reject profile with invalid name length')
  test('should reject bio exceeding 500 characters')
  test('should add multiple kids with valid ages')
  test('should reject kid with age > 18')
  test('should add multiple interests')
  test('should upload profile photo and return URL')
  test('should retrieve profile by user ID')
  test('should update profile visibility setting')
  test('should mark onboarding as completed')
})

describe('Location Service', () => {
  test('should request and receive location permission')
  test('should get current GPS coordinates')
  test('should reverse geocode coordinates to city/state')
  test('should handle location permission denial gracefully')
})
```

### Acceptance Criteria
- [ ] Multi-step onboarding flow works sequentially
- [ ] User can add one or more kids with ages
- [ ] User can select multiple interests from list
- [ ] GPS location auto-detects city/state
- [ ] Manual city entry works if GPS denied
- [ ] Profile photo uploads to Supabase Storage
- [ ] Bio accepts up to 500 characters
- [ ] Privacy settings save correctly
- [ ] Onboarding completion flag set in database
- [ ] All unit tests pass

### Integration Tests (After Feature 2)
```typescript
describe('Auth + Profile Integration', () => {
  test('should complete full signup to profile creation flow')
  test('should persist profile data after app restart')
  test('should allow profile editing after onboarding')
})
```

---

## FEATURE 3: Mom Matching (Swipe Interface)

### Requirements
- Tinder-style card stack UI for discovering moms
- Matching algorithm based on:
  - City-level location (same city)
  - Kids' age ranges (±2 years overlap)
  - Shared interests (at least 1 common interest)
- Mutual right swipe creates a match
- Match notification
- Respect privacy settings (only show public profiles or matches-only if already matched)

### User Flow
1. User navigates to "Discover" tab
2. See card stack of potential mom matches
3. Each card shows:
   - Profile photo
   - Name, age of kids
   - Shared interests highlighted
   - Distance (same city)
   - Bio snippet
4. Swipe right (like) or left (pass)
5. If mutual right swipe → Match created
6. Match notification appears
7. Can start messaging from matches list

### Matching Algorithm Logic
```
Filter potential matches WHERE:
  - user.city = current_user.city
  - user.profile_visibility = 'public' OR (user.profile_visibility = 'matches_only' AND already_matched)
  - user.id != current_user.id
  - user.id NOT IN (already_swiped_by_current_user)
  - EXISTS (
      SELECT 1 FROM kids k1
      JOIN kids k2 ON ABS(k1.age - k2.age) <= 2
      WHERE k1.user_id = current_user.id AND k2.user_id = user.id
    )
  - EXISTS (
      SELECT 1 FROM user_interests ui1
      JOIN user_interests ui2 ON ui1.interest = ui2.interest
      WHERE ui1.user_id = current_user.id AND ui2.user_id = user.id
    )

ORDER BY:
  - Number of shared interests DESC
  - Created_at DESC (newer users first)

LIMIT 50 (load in batches)
```

### Technical Implementation

#### Database Schema
```sql
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  swiped_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('left', 'right')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (user1_id < user2_id), -- Ensure consistent ordering
  UNIQUE(user1_id, user2_id)
);

-- RLS Policies
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own swipes"
  ON swipes FOR INSERT
  WITH CHECK (auth.uid() = swiper_id);

CREATE POLICY "Users can read own swipes"
  ON swipes FOR SELECT
  USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

CREATE POLICY "Users can read own matches"
  ON matches FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);
```

#### Key Functions
```typescript
// matching.service.ts
interface PotentialMatch {
  id: string;
  name: string;
  profilePhotoUrl: string;
  bio: string;
  kids: { age: number }[];
  interests: string[];
  sharedInterests: string[];
  city: string;
}

async function getPotentialMatches(userId: string, limit: number = 20): Promise<PotentialMatch[]>
async function recordSwipe(swiperId: string, swipedId: string, direction: 'left' | 'right'): Promise<Match | null>
async function checkForMatch(user1Id: string, user2Id: string): Promise<boolean>
async function createMatch(user1Id: string, user2Id: string): Promise<Match>
async function getMatches(userId: string): Promise<Match[]>
async function deleteMatch(matchId: string): Promise<void>
```

#### UI Components
- **SwipeCard**: Individual profile card
- **CardStack**: Animated stack of cards
- **MatchModal**: Celebration modal on new match
- **MatchesList**: List of current matches

### Unit Tests
```typescript
describe('Matching Service', () => {
  test('should fetch potential matches based on city, kids ages, and interests')
  test('should exclude already swiped profiles')
  test('should exclude users with no overlapping kids ages')
  test('should exclude users with no shared interests')
  test('should record right swipe')
  test('should record left swipe')
  test('should create match when mutual right swipe exists')
  test('should not create match on left swipe')
  test('should not create match if only one user swiped right')
  test('should retrieve all matches for user')
  test('should delete match when requested')
})

describe('Matching Algorithm', () => {
  test('should prioritize users with more shared interests')
  test('should include users with kids within ±2 year age range')
  test('should only show public profiles')
  test('should respect matches_only visibility for existing matches')
})
```

### Acceptance Criteria
- [ ] User sees stack of potential matches
- [ ] Swipe left/right gestures work smoothly
- [ ] Algorithm filters by city, kids' ages (±2 years), shared interests
- [ ] Mutual right swipe creates match
- [ ] Match notification displays
- [ ] Matches appear in matches list
- [ ] Privacy settings respected in matching
- [ ] Can't see same profile twice
- [ ] All unit tests pass

---

## FEATURE 4: One-on-One Messaging

### Requirements
- Real-time direct messaging between matched moms
- Message history persistence
- Unread message count
- Online/typing indicators (optional for MVP)
- Message timestamps
- Can only message users you've matched with

### User Flow
1. User taps on a match from matches list
2. Opens chat interface
3. Can send text messages
4. Messages appear in real-time
5. See message history
6. See unread count badge on matches list

### Technical Implementation

#### Database Schema
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 2000),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_messages_sender_recipient ON messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_messages_recipient_unread ON messages(recipient_id, read_at) WHERE read_at IS NULL;

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send messages to matched users"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM matches
      WHERE (user1_id = sender_id AND user2_id = recipient_id)
         OR (user1_id = recipient_id AND user2_id = sender_id)
    )
  );

CREATE POLICY "Users can read their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can update read status of received messages"
  ON messages FOR UPDATE
  USING (auth.uid() = recipient_id);
```

#### Key Functions
```typescript
// messaging.service.ts
interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  readAt?: string;
  createdAt: string;
}

interface Conversation {
  matchId: string;
  otherUser: Profile;
  lastMessage: Message;
  unreadCount: number;
}

async function sendMessage(senderId: string, recipientId: string, content: string): Promise<Message>
async function getConversation(userId: string, matchId: string, limit: number = 50): Promise<Message[]>
async function getConversations(userId: string): Promise<Conversation[]>
async function markAsRead(messageId: string): Promise<void>
async function getUnreadCount(userId: string, matchId: string): Promise<number>

// realtime.service.ts
function subscribeToMessages(userId: string, matchId: string, callback: (message: Message) => void): Subscription
function unsubscribe(subscription: Subscription): void
```

#### Real-time Implementation
```typescript
// Using Supabase Realtime
const subscription = supabase
  .channel(`messages:${userId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `recipient_id=eq.${userId}`
    },
    (payload) => {
      // New message received
      handleNewMessage(payload.new as Message);
    }
  )
  .subscribe();
```

#### UI Components
- **ConversationList**: List of all conversations with unread badges
- **ChatScreen**: Individual chat interface
- **MessageBubble**: Individual message component
- **MessageInput**: Text input with send button

### Unit Tests
```typescript
describe('Messaging Service', () => {
  test('should send message between matched users')
  test('should reject message to non-matched user')
  test('should retrieve conversation history')
  test('should retrieve messages in chronological order')
  test('should mark message as read')
  test('should calculate unread count correctly')
  test('should retrieve all conversations for user')
  test('should order conversations by last message timestamp')
  test('should respect 2000 character limit')
})

describe('Realtime Messaging', () => {
  test('should receive new messages in real-time')
  test('should update unread count when new message arrives')
  test('should handle subscription cleanup on unmount')
})
```

### Acceptance Criteria
- [ ] User can send text messages to matched moms
- [ ] Messages appear in real-time for recipient
- [ ] Message history loads correctly
- [ ] Unread message count displays on conversation list
- [ ] Messages marked as read when viewed
- [ ] Can only message matched users (enforced by RLS)
- [ ] Character limit enforced (2000 chars)
- [ ] All unit tests pass

### Integration Tests (After Feature 4)
```typescript
describe('Matching + Messaging Integration', () => {
  test('should allow messaging only after mutual match')
  test('should create conversation after first message sent')
  test('should update match list when new message received')
  test('should maintain message history across app restarts')
})
```

---

## FEATURE 5: Group Discovery & Joining

### Requirements
- Pre-created groups in three categories:
  - **Season of Life**: Expecting, Newborn (0-1yr), Toddler (1-3yr), Preschool (3-5yr), School Age (5-12yr), Teens (13-18yr), Grown Kids (18+)
  - **Interest-Based**: Working Moms, Stay-at-Home Moms, Homeschooling, Single Parents, Fitness & Wellness, Arts & Crafts, etc.
  - **Local**: City/neighborhood-based
- Group recommendations based on user profile (kids' ages, interests, location)
- Request to join groups (requires admin approval)
- Search/browse all groups
- View group details before joining

### User Flow
1. User navigates to "Groups" tab
2. See two sections:
   - **Recommended For You**: Smart recommendations
   - **Discover Groups**: Browse all groups by category
3. Tap on a group to see details:
   - Group name, description
   - Member count
   - Admin(s)
   - Recent activity preview
4. Tap "Request to Join"
5. Admin receives notification and approves/denies
6. User notified when approved
7. Group appears in "My Groups"

### Group Recommendations Logic
```
Recommend groups WHERE:
  - Group type = 'season_of_life' AND group.age_range overlaps with user's kids ages
  - OR Group type = 'interest_based' AND group.interest IN user's interests
  - OR Group type = 'local' AND group.city = user's city

ORDER BY:
  - Match score (number of matching criteria) DESC
  - Member count DESC (more active groups)

LIMIT 10
```

### Technical Implementation

#### Database Schema
```sql
CREATE TYPE group_type AS ENUM ('season_of_life', 'interest_based', 'local');
CREATE TYPE member_role AS ENUM ('admin', 'member', 'pending');

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  group_type group_type NOT NULL,
  category TEXT, -- e.g., 'Newborn (0-1yr)', 'Working Moms', city name
  city TEXT, -- Only for local groups
  min_age INTEGER, -- For season_of_life groups
  max_age INTEGER, -- For season_of_life groups
  interest TEXT, -- For interest_based groups
  cover_photo_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role DEFAULT 'pending',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- RLS Policies
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read groups"
  ON groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update their groups"
  ON groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = groups.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Users can read group memberships"
  ON group_members FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can request to join groups"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'pending');

CREATE POLICY "Admins can manage group members"
  ON group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);
```

#### Seed Data Script
```sql
-- Season of Life Groups
INSERT INTO groups (name, description, group_type, category, min_age, max_age) VALUES
  ('Expecting Moms', 'For moms-to-be to connect and share the journey', 'season_of_life', 'Expecting', NULL, NULL),
  ('Newborn (0-1yr)', 'Navigate the newborn phase together', 'season_of_life', 'Newborn', 0, 1),
  ('Toddler (1-3yr)', 'Toddler tips, tantrums, and triumphs', 'season_of_life', 'Toddler', 1, 3),
  ('Preschool (3-5yr)', 'Preschool prep and playdate planning', 'season_of_life', 'Preschool', 3, 5),
  ('School Age (5-12yr)', 'Elementary and middle school years', 'season_of_life', 'School Age', 5, 12),
  ('Teens (13-18yr)', 'Surviving and thriving through the teen years', 'season_of_life', 'Teens', 13, 18),
  ('Grown Kids (18+)', 'Empty nest and adult children', 'season_of_life', 'Grown Kids', 18, NULL);

-- Interest-Based Groups
INSERT INTO groups (name, description, group_type, category, interest) VALUES
  ('Working Moms', 'Balancing career and motherhood', 'interest_based', 'Working Moms', 'working_mom'),
  ('Stay-at-Home Moms', 'Full-time parenting community', 'interest_based', 'Stay-at-Home Moms', 'stay_at_home'),
  ('Homeschooling Families', 'Resources and support for homeschoolers', 'interest_based', 'Homeschooling', 'homeschooling'),
  ('Single Parents', 'Support network for single moms and dads', 'interest_based', 'Single Parents', 'single_parent'),
  ('Fitness & Wellness', 'Health-focused moms', 'interest_based', 'Fitness & Wellness', 'fitness'),
  ('Arts & Crafts', 'Creative projects and DIY ideas', 'interest_based', 'Arts & Crafts', 'arts_crafts');
```

#### Key Functions
```typescript
// groups.service.ts
interface Group {
  id: string;
  name: string;
  description: string;
  groupType: 'season_of_life' | 'interest_based' | 'local';
  category: string;
  memberCount: number;
  coverPhotoUrl?: string;
}

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member' | 'pending';
  joinedAt: string;
}

async function getRecommendedGroups(userId: string): Promise<Group[]>
async function searchGroups(query: string, filters?: GroupFilters): Promise<Group[]>
async function getGroupDetails(groupId: string): Promise<GroupDetails>
async function requestToJoinGroup(userId: string, groupId: string): Promise<GroupMember>
async function getMyGroups(userId: string): Promise<Group[]>
async function getPendingRequests(groupId: string): Promise<GroupMember[]> // Admin only
async function approveJoinRequest(groupId: string, userId: string): Promise<void> // Admin only
async function denyJoinRequest(groupId: string, userId: string): Promise<void> // Admin only
async function leaveGroup(userId: string, groupId: string): Promise<void>
```

#### UI Components
- **GroupCard**: Individual group card in lists
- **RecommendedGroups**: Horizontal scroll of recommendations
- **GroupBrowser**: Categorized browsing interface
- **GroupDetails**: Full group information screen
- **PendingRequestsList**: Admin view of pending requests

### Unit Tests
```typescript
describe('Groups Service', () => {
  test('should fetch recommended groups based on user kids ages')
  test('should fetch recommended groups based on user interests')
  test('should fetch recommended local groups based on user city')
  test('should search groups by name')
  test('should filter groups by type')
  test('should get detailed group information')
  test('should create join request with pending status')
  test('should retrieve user groups (approved only)')
  test('should retrieve pending join requests for group admin')
  test('should approve join request and change role to member')
  test('should deny and delete join request')
  test('should allow user to leave group')
  test('should not allow non-admin to approve requests')
})
```

### Acceptance Criteria
- [ ] User sees personalized group recommendations
- [ ] Recommendations match kids' ages, interests, location
- [ ] User can browse all groups by category
- [ ] User can search groups by name
- [ ] Group details show member count and description
- [ ] User can request to join a group
- [ ] Join request creates pending membership
- [ ] Admin receives notification of pending request
- [ ] Admin can approve/deny requests
- [ ] Approved user becomes group member
- [ ] User can leave a group
- [ ] All unit tests pass

---

## FEATURE 6: Group Chat

### Requirements
- Real-time messaging within groups
- All group members can send/receive messages
- Message history for new members (access to past messages)
- Admin moderation powers:
  - Remove messages
  - Kick members from group
  - Ban members (prevent rejoining)
- Member list visibility
- Typing indicators (optional for MVP)

### User Flow
1. User taps on group from "My Groups"
2. Opens group chat interface
3. Can send text messages
4. All members see messages in real-time
5. Tap group name to see:
   - Member list
   - Group settings (if admin)
6. **Admin Powers**:
   - Long-press message → Delete option
   - Tap member → Kick/Ban options

### Technical Implementation

#### Database Schema
```sql
CREATE TABLE group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES profiles(id)
);

CREATE TABLE group_bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Indexes
CREATE INDEX idx_group_messages_group_time ON group_messages(group_id, created_at DESC);

-- RLS Policies
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read group messages"
  ON group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_messages.group_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'member')
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Group members can send messages"
  ON group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_messages.group_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'member')
    ) AND
    NOT EXISTS (
      SELECT 1 FROM group_bans
      WHERE group_id = group_messages.group_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can soft-delete messages"
  ON group_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_messages.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage bans"
  ON group_bans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_bans.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );
```

#### Key Functions
```typescript
// groupChat.service.ts
interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl: string;
  content: string;
  createdAt: string;
  deletedAt?: string;
}

async function sendGroupMessage(groupId: string, senderId: string, content: string): Promise<GroupMessage>
async function getGroupMessages(groupId: string, limit: number = 100): Promise<GroupMessage[]>
async function deleteMessage(messageId: string, adminId: string): Promise<void>
async function getGroupMembers(groupId: string): Promise<GroupMember[]>
async function kickMember(groupId: string, adminId: string, memberId: string): Promise<void>
async function banMember(groupId: string, adminId: string, memberId: string, reason?: string): Promise<void>
async function unbanMember(groupId: string, adminId: string, memberId: string): Promise<void>
async function isUserBanned(groupId: string, userId: string): Promise<boolean>

// groupRealtime.service.ts
function subscribeToGroupMessages(groupId: string, callback: (message: GroupMessage) => void): Subscription
```

#### Real-time Implementation
```typescript
const subscription = supabase
  .channel(`group:${groupId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'group_messages',
      filter: `group_id=eq.${groupId}`
    },
    (payload) => {
      handleNewGroupMessage(payload.new as GroupMessage);
    }
  )
  .subscribe();
```

#### UI Components
- **GroupChatScreen**: Main chat interface
- **GroupMessageBubble**: Individual message with sender info
- **MembersList**: List of group members with admin controls
- **AdminControls**: Context menu for message/member actions

### Unit Tests
```typescript
describe('Group Chat Service', () => {
  test('should send message to group as member')
  test('should reject message from non-member')
  test('should reject message from banned user')
  test('should retrieve group message history')
  test('should load messages in chronological order')
  test('should soft-delete message as admin')
  test('should not allow non-admin to delete messages')
  test('should retrieve all group members')
  test('should kick member from group as admin')
  test('should ban member from group as admin')
  test('should prevent banned user from rejoining')
  test('should unban member as admin')
  test('should not allow non-admin to kick/ban members')
})

describe('Group Chat Realtime', () => {
  test('should receive new messages in real-time')
  test('should broadcast messages to all group members')
  test('should handle subscription cleanup')
})
```

### Acceptance Criteria
- [ ] Group members can send messages to group
- [ ] Messages appear in real-time for all members
- [ ] New members can see message history
- [ ] Admin can delete any message
- [ ] Admin can view member list
- [ ] Admin can kick member from group
- [ ] Admin can ban member (prevents rejoining)
- [ ] Banned users cannot send messages or rejoin
- [ ] Non-admins cannot access admin functions
- [ ] Character limit enforced (2000 chars)
- [ ] All unit tests pass

### Integration Tests (After Feature 6 - FINAL MVP)
```typescript
describe('Full MVP Integration', () => {
  test('should complete full user journey: signup → profile → matching → messaging → groups')
  test('should handle concurrent group memberships')
  test('should maintain separate message threads for DMs and groups')
  test('should respect privacy settings across matching and groups')
  test('should handle admin permissions correctly across features')
  test('should handle real-time updates across all messaging features')
  test('should persist all data across app restarts')
})
```

---

## Non-Functional Requirements

### Performance
- App launch time: < 3 seconds
- Message delivery: < 1 second for real-time
- Swipe animation: 60 FPS
- Image uploads: < 5 seconds for average photo

### Security
- All API calls authenticated via Supabase JWT
- Row Level Security (RLS) enforced on all tables
- No direct database access from client
- Profile photos stored in private buckets with signed URLs
- Password requirements enforced

### Privacy
- User location stored as city-level only
- GPS coordinates not shared publicly
- Profile visibility settings respected
- Users can delete their account (cascade delete all data)
- Report/block functionality (Phase 2)

### Scalability
- Designed for 10,000+ users initially
- Paginated queries for all lists
- Efficient database indexes
- CDN for static assets via Supabase Storage

---

## Database Indexes (Performance Optimization)

```sql
-- Already defined in schemas above, summarized here:
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_kids_user_age ON kids(user_id, age);
CREATE INDEX idx_user_interests_user ON user_interests(user_id, interest);
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id, created_at DESC);
CREATE INDEX idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX idx_messages_sender_recipient ON messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_messages_recipient_unread ON messages(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_group_members_user ON group_members(user_id, role);
CREATE INDEX idx_group_messages_group_time ON group_messages(group_id, created_at DESC);
```

---

## Environment Variables

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-api-key
```

---

## File Structure

```
/mom-connect
├── /src
│   ├── /screens
│   │   ├── AuthScreen.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── DiscoverScreen.tsx
│   │   ├── MatchesScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── GroupsScreen.tsx
│   │   ├── GroupChatScreen.tsx
│   ├── /components
│   │   ├── SwipeCard.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── GroupCard.tsx
│   ├── /services
│   │   ├── auth.service.ts
│   │   ├── profile.service.ts
│   │   ├── matching.service.ts
│   │   ├── messaging.service.ts
│   │   ├── groups.service.ts
│   │   ├── groupChat.service.ts
│   │   ├── supabase.client.ts
│   ├── /utils
│   │   ├── location.utils.ts
│   │   ├── validation.utils.ts
│   ├── /types
│   │   ├── models.ts
│   ├── /navigation
│   │   ├── AppNavigator.tsx
│   ├── /tests
│   │   ├── /unit
│   │   │   ├── auth.test.ts
│   │   │   ├── profile.test.ts
│   │   │   ├── matching.test.ts
│   │   │   ├── messaging.test.ts
│   │   │   ├── groups.test.ts
│   │   │   ├── groupChat.test.ts
│   │   ├── /integration
│   │   │   ├── auth-profile.test.ts
│   │   │   ├── matching-messaging.test.ts
│   │   │   ├── mvp-flow.test.ts
├── app.json
├── package.json
├── tsconfig.json
├── .env
└── README.md
```

---

## Development Workflow

### Feature Development Process
1. **Read Feature Spec**: Understand requirements and acceptance criteria
2. **Implement Feature**: Build UI components, services, database schema
3. **Write Unit Tests**: Test all functions and edge cases
4. **Run Tests**: Fix code until all unit tests pass
5. **Manual Testing**: Verify UI/UX works as expected
6. **Integration Tests** (if multiple features complete): Test feature interactions
7. **Commit & Deploy**: Push to repository

### Testing Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test auth.test.ts

# Run tests in watch mode
npm test -- --watch

# Run integration tests
npm test -- integration/
```

### Database Migration Process
1. Write SQL schema changes
2. Apply via Supabase dashboard or migration file
3. Update TypeScript types
4. Test locally
5. Deploy to production Supabase instance

---

## Phase 2+ Features (Future)

### Phase 2: Enhanced Safety & Resources
- Report/block users
- Content moderation system
- Activity ideas (user-generated)
- Local resources hub (Google Places integration)
- Mental health check-ins

### Phase 3: Marketplace
- Buy/sell listings
- Service bookings
- Payment integration (Stripe)

### Phase 4: Advanced Features
- Push notifications (Expo Notifications)
- Video/voice calls (Agora, Twilio)
- Event planning within groups
- Analytics dashboard (admin)

---

## Success Metrics (MVP)

### User Engagement
- Daily Active Users (DAU)
- Average session duration
- Messages sent per user per day
- Match rate (successful matches / swipes)

### Growth
- New user signups per week
- User retention (Day 1, Day 7, Day 30)
- Group join rate

### Technical
- App crash rate < 1%
- API response time < 500ms (p95)
- Real-time message delivery success rate > 99%

---

## Appendix: Supabase Setup Checklist

- [ ] Create Supabase project
- [ ] Enable email authentication
- [ ] Create database tables (run SQL schemas)
- [ ] Set up Row Level Security policies
- [ ] Create storage bucket for profile photos (private)
- [ ] Enable Realtime for messages and group_messages tables
- [ ] Generate API keys (anon, service_role)
- [ ] Configure email templates for verification
- [ ] Set up database indexes
- [ ] Seed initial groups data

---

## Appendix: Google Places API Setup

- [ ] Enable Google Places API in Google Cloud Console
- [ ] Enable Geocoding API for reverse geocoding
- [ ] Create API key with restrictions (mobile app only)
- [ ] Set usage quotas/billing alerts
- [ ] Test API integration in development

---

**End of Specification**

---

## Notes for Antigravity

- Implement features sequentially (1 → 6)
- After each feature: write unit tests, fix code until tests pass
- After features 2, 4, 6: write integration tests
- Use Expo best practices for mobile development
- Follow React Native performance guidelines
- Implement proper error handling and loading states
- Add user-friendly error messages
- Use TypeScript for type safety
- Follow Supabase Row Level Security best practices

**This spec is comprehensive and ready for implementation. Good luck!** 🚀
