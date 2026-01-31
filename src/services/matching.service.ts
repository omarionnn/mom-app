import { supabase } from './supabase.client';
import { PotentialMatch, Match } from '../types/models';

export async function getPotentialMatches(userId: string, limit: number = 20): Promise<PotentialMatch[]> {
    // 1. Get current user's details to filter by
    const { data: currentUser, error: userError } = await supabase
        .from('profiles')
        .select('city, id')
        .eq('id', userId)
        .single();

    if (userError || !currentUser) throw new Error('Could not fetch current user.');

    // 2. Get IDs of users already swiped
    const { data: swipes } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', userId);

    const swipedIds = swipes?.map(s => s.swiped_id) || [];
    const excludeIds = [userId, ...swipedIds];

    // 3. Fetch potential matches (In same city for MVP)
    // Note: Complex filtering (kids ages overlap) usually easier in a Postgres Function 
    // but we will do basic filtering in basic query + client side for MVP or a simple join if RLS allows.
    // We'll fetch profiles in same city.
    let query = supabase
        .from('profiles')
        .select(`
      id, name, bio, city, profile_photo_url,
      kids (age),
      user_interests (interest)
    `)
        .eq('city', currentUser.city);

    if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data: profiles, error: matchesError } = await query.limit(limit);

    if (matchesError) throw new Error(matchesError.message);

    if (!profiles || profiles.length === 0) {
        // Fallback: Fetch users from ANY city if no locals found (For Demo/MVP)
        let fallbackQuery = supabase
            .from('profiles')
            .select(`
                id, name, bio, city, profile_photo_url,
                kids (age),
                user_interests (interest)
            `);

        if (excludeIds.length > 0) {
            fallbackQuery = fallbackQuery.not('id', 'in', `(${excludeIds.join(',')})`);
        } else {
            fallbackQuery = fallbackQuery.neq('id', userId);
        }

        const { data: fallbackProfiles, error: fallbackError } = await fallbackQuery.limit(limit);

        if (!fallbackError && fallbackProfiles) {
            return fallbackProfiles.map((p: any) => ({
                id: p.id,
                name: p.name,
                bio: p.bio,
                city: p.city,
                profile_photo_url: p.profile_photo_url,
                kids: p.kids || [],
                interests: p.user_interests?.map((ui: any) => ui.interest) || [],
                sharedInterests: []
            }));
        }
    }

    if (!profiles) return [];

    // Transform to Clean Model
    // TODO: Add client-side filtering for kids age overlap if not done in SQL
    return profiles.map((p: any) => ({
        id: p.id,
        name: p.name,
        bio: p.bio,
        city: p.city,
        profile_photo_url: p.profile_photo_url,
        kids: p.kids || [],
        interests: p.user_interests?.map((ui: any) => ui.interest) || [],
        sharedInterests: [] // TODO: calculate intersection
    }));
}

export async function recordSwipe(swiperId: string, swipedId: string, direction: 'left' | 'right'): Promise<Match | null> {
    // 1. Record Swipe
    const { error } = await supabase.from('swipes').insert({
        swiper_id: swiperId,
        swiped_id: swipedId,
        direction
    });

    if (error) {
        if (error.code === '23505') return null; // Duplicate swipe, ignore or handle
        throw new Error(error.message);
    }

    // 2. If Right Swipe, check for match
    if (direction === 'right') {
        const { data: reciprocalSwipe } = await supabase
            .from('swipes')
            .select('*')
            .eq('swiper_id', swipedId)
            .eq('swiped_id', swiperId)
            .eq('direction', 'right')
            .single();

        if (reciprocalSwipe) {
            // It's a match!
            return await createMatch(swiperId, swipedId);
        }
    }

    return null;
}

async function createMatch(user1Id: string, user2Id: string): Promise<Match> {
    // Ensure consistent ordering for unique constraint if we have one (user1_id < user2_id)
    // The DB constraint usually handles (user1_id < user2_id). We must sort.
    const [u1, u2] = [user1Id, user2Id].sort();

    const { data, error } = await supabase
        .from('matches')
        .insert({ user1_id: u1, user2_id: u2 })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}
