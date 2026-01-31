import { supabase } from './supabase.client';
import { Profile, ProfileUpdateData, Kid } from '../types/models';

export async function updateProfile(userId: string, data: ProfileUpdateData): Promise<Profile | null> {
    // 1. Update/Upsert Profile Basics
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId, // Required for upsert
            email: data.email, // Required if inserting new row
            name: data.name,
            bio: data.bio,
            city: data.city,
            state: data.state,
            latitude: data.latitude,
            longitude: data.longitude,
            profile_visibility: data.profileVisibility,
            onboarding_completed: data.onboardingCompleted,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (profileError) throw new Error(profileError.message);

    // 2. Manage Kids (Delete all and re-insert to ensure sync)
    // Note: In a production app with references to specific kids, we would upsert by ID.
    if (data.kids) {
        // First delete existing
        const { error: deleteKidsError } = await supabase
            .from('kids')
            .delete()
            .eq('user_id', userId);

        if (deleteKidsError) throw new Error(deleteKidsError.message);

        if (data.kids.length > 0) {
            const kidsData = data.kids.map(kid => ({
                user_id: userId,
                age: kid.age
            }));

            const { error: kidsError } = await supabase
                .from('kids')
                .insert(kidsData);

            if (kidsError) throw new Error(kidsError.message);
        }
    }

    // 3. Manage Interests (Delete all and re-insert)
    if (data.interests) {
        // First delete existing
        const { error: deleteInterestsError } = await supabase
            .from('user_interests')
            .delete()
            .eq('user_id', userId);

        if (deleteInterestsError) throw new Error(deleteInterestsError.message);

        if (data.interests.length > 0) {
            const interestData = data.interests.map(interest => ({
                user_id: userId,
                interest
            }));

            const { error: interestError } = await supabase
                .from('user_interests')
                .insert(interestData);

            if (interestError) throw new Error(interestError.message);
        }
    }

    return profileData;
}

export async function uploadProfilePhoto(userId: string, imageUri: string): Promise<string | null> {
    // TODO: Implement actual Supabase Storage upload
    // return public URL of uploaded image
    console.log('Uploading photo for user:', userId, imageUri);
    return 'https://placekitten.com/200/200'; // Mock URL
}

export async function completeOnboarding(userId: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);

    if (error) throw new Error(error.message);
}

export async function getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) return null; // Or throw
    return data;
}
