export type UserType = 'mom' | 'expecting' | 'caregiver';

export interface Profile {
    id: string;
    email: string;
    user_type: UserType | null;
    guidelines_accepted_at: string | null;
    name: string | null;
    bio: string | null;
    profile_photo_url: string | null;
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
    profile_visibility: 'public' | 'matches_only' | 'private';
    onboarding_completed: boolean;
    kids?: Kid[];
    interests?: string[];
    created_at: string;
    updated_at: string;
}

export interface Kid {
    id?: string;
    user_id?: string;
    age: number;
    created_at?: string;
}

export interface ProfileUpdateData {
    email?: string; // Optional, needed for upsert if row missing
    name: string;
    bio?: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
    profileVisibility: 'public' | 'matches_only' | 'private';
    kids: Kid[];
    interests: string[];
    onboardingCompleted?: boolean;
}

export interface SignUpData {
    email: string;
    password: string;
    userType: UserType;
    guidelinesAccepted: boolean;
}

export interface AuthResult {
    session: any | null;
    user: any | null;
    error: any | null;
}

export interface PotentialMatch {
    id: string;
    name: string;
    profile_photo_url: string | null;
    bio: string | null;
    city: string;
    kids: Kid[];
    interests: string[];
    sharedInterests: string[];
}

export interface Match {
    id: string;
    user1_id: string;
    user2_id: string;
    created_at: string;
    otherUser?: PotentialMatch;
}

export interface Message {
    id: string;
    sender_id: string;
    recipient_id: string;
    content: string;
    read_at?: string | null;
    created_at: string;
}

export interface Conversation {
    match_id: string;
    other_user: {
        id: string;
        name: string;
        profile_photo_url: string | null;
    };
    last_message?: Message;
    unread_count: number;
}

export type GroupType = 'season_of_life' | 'interest_based' | 'local';

export interface Group {
    id: string;
    name: string;
    description: string;
    group_type: GroupType;
    category: string;
    city?: string | null;
    min_age?: number | null;
    max_age?: number | null;
    interest?: string | null;
    cover_photo_url?: string | null;
    member_count: number;
    created_at: string;
    is_member?: boolean; // UI helper
}

export interface GroupMessage {
    id: string;
    group_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender?: {
        name: string;
        profile_photo_url: string | null;
    };
}
