import { supabase } from './supabase.client';
import { SignUpData, AuthResult } from '../types/models';

export async function signUp(data: SignUpData): Promise<AuthResult> {
    // Validate guidelines acceptance
    if (!data.guidelinesAccepted) {
        return {
            session: null,
            user: null,
            error: new Error('Guidelines must be accepted')
        };
    }

    // Validate password (basic check, Supabase also enforces min length)
    if (data.password.length < 8) {
        return {
            session: null,
            user: null,
            error: new Error('Password must be at least 8 characters')
        };
    }

    const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: {
                user_type: data.userType,
                guidelines_accepted_at: new Date().toISOString(),
            },
        },
    });

    return { session: authData.session, user: authData.user, error };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { session: data.session, user: data.user, error };
}

export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
