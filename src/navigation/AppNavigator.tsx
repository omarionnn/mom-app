import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Text, Button } from 'react-native';
import { supabase } from '../services/supabase.client';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { signOut } from '../services/auth.service';
import { getProfile } from '../services/profile.service';
import { OnboardingProvider, useOnboarding } from '../contexts/OnboardingContext';

import DiscoverScreen from '../screens/DiscoverScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ChatScreen from '../screens/ChatScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GroupChatScreen from '../screens/GroupChatScreen';

import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

function AppNavigatorContent() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isLongLoading, setIsLongLoading] = useState(false);
    const { isOnboarded, setIsOnboarded } = useOnboarding();

    // Helper function to fetch profile and set onboarding status
    const fetchAndSetOnboardingStatus = useCallback(async (userId: string) => {
        console.log('[AppNavigator] Fetching profile for user:', userId);
        try {
            const profile = await getProfile(userId);
            console.log('[AppNavigator] Profile fetched:', profile);
            const onboarded = !!profile?.onboarding_completed;
            console.log('[AppNavigator] Setting isOnboarded to:', onboarded);
            setIsOnboarded(onboarded);
            return onboarded;
        } catch (e) {
            console.error('[AppNavigator] Profile fetch error:', e);
            // If profile doesn't exist, they need onboarding
            setIsOnboarded(false);
            return false;
        }
    }, [setIsOnboarded]);

    const initializeAuth = useCallback(async () => {
        setLoading(true);
        setIsLongLoading(false);
        console.log('[AppNavigator] Initializing auth...');

        // Timeout to show slow connection message
        const timer = setTimeout(() => {
            setIsLongLoading(true);
        }, 5000);

        try {
            console.log('[AppNavigator] Calling getSession...');
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('[AppNavigator] Error getting session:', error);
                // Handle invalid refresh token by clearing the stale session
                if (error?.message?.includes('Refresh Token') || (error as any)?.code === 'refresh_token_not_found') {
                    console.log('[AppNavigator] Invalid token detected, signing out...');
                    await supabase.auth.signOut();
                }
                setSession(null);
                setIsOnboarded(false);
            } else {
                console.log('[AppNavigator] Session retrieved:', session ? 'Session exists' : 'No session');
                setSession(session);

                if (session?.user) {
                    await fetchAndSetOnboardingStatus(session.user.id);
                } else {
                    // No session, no need to check onboarding
                    setIsOnboarded(false);
                }
            }
        } catch (e) {
            console.error('[AppNavigator] Unexpected error:', e);
            setSession(null);
            setIsOnboarded(false);
        } finally {
            clearTimeout(timer);
            setLoading(false);
            console.log('[AppNavigator] Initialization complete.');
        }
    }, [setIsOnboarded, fetchAndSetOnboardingStatus]);

    useEffect(() => {
        console.log('[AppNavigator] Mounted');
        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            console.log('[AppNavigator] Auth state changed:', _event);

            // Handle sign out - just clear session, no need to touch onboarding
            if (_event === 'SIGNED_OUT') {
                console.log('[AppNavigator] User signed out');
                setSession(null);
                // Don't set isOnboarded to false - leave it as is until new user signs in
                return;
            }

            // Handle sign in - need to fetch profile and set onboarding status
            if (_event === 'SIGNED_IN' && newSession?.user) {
                console.log('[AppNavigator] User signed in, fetching profile...');
                setLoading(true); // Show loading while we fetch profile
                setSession(newSession);
                await fetchAndSetOnboardingStatus(newSession.user.id);
                setLoading(false);
                return;
            }

            // For other events (TOKEN_REFRESHED, INITIAL_SESSION, etc.)
            // Just update session, don't change onboarding status unless it's initial
            if (_event === 'INITIAL_SESSION' && newSession?.user) {
                setSession(newSession);
                // Only fetch if we haven't already (isOnboarded is still null)
                if (isOnboarded === null) {
                    await fetchAndSetOnboardingStatus(newSession.user.id);
                }
            } else if (_event === 'TOKEN_REFRESHED') {
                // Just update session, keep onboarding status as is
                setSession(newSession);
            }
        });

        return () => subscription.unsubscribe();
    }, [initializeAuth, fetchAndSetOnboardingStatus, isOnboarded, setIsOnboarded]);

    // Show loading screen while determining auth/onboarding state
    if (loading || (session && isOnboarded === null)) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
                <ActivityIndicator size="large" color="#E91E63" />
                {isLongLoading && (
                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                        <Text style={{ marginBottom: 10, color: '#666' }}>Connection is taking a while...</Text>
                        <Button title="Retry" onPress={initializeAuth} color="#E91E63" />
                        <Button title="Go to Login" onPress={() => { setLoading(false); setSession(null); }} />
                    </View>
                )}
            </View>
        );
    }

    console.log('[AppNavigator] Rendering - session:', !!session, 'isOnboarded:', isOnboarded);

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!session ? (
                    <Stack.Screen name="Auth" component={AuthScreen} />
                ) : isOnboarded === false ? (
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : (
                    <>
                        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                        <Stack.Screen name="Chat" component={ChatScreen} />
                        <Stack.Screen name="GroupChat" component={GroupChatScreen} />
                        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function AppNavigator() {
    return (
        <OnboardingProvider>
            <AppNavigatorContent />
        </OnboardingProvider>
    );
}
