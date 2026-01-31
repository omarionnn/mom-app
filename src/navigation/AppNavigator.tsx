import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Text, Button } from 'react-native';
import { supabase } from '../services/supabase.client';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { signOut } from '../services/auth.service';
import { getProfile } from '../services/profile.service';

import DiscoverScreen from '../screens/DiscoverScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ChatScreen from '../screens/ChatScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GroupChatScreen from '../screens/GroupChatScreen';

// Placeholder Home Screen for verified auth
// For MVP, "Home" will be the Discover Screen or a Tab Navigator eventually.
// Let's just point "Home" to DiscoverScreen for now or render DiscoverScreen as part of main stack.


import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
    const [isLongLoading, setIsLongLoading] = useState(false);

    const initializeAuth = useCallback(() => {
        setLoading(true);
        setIsLongLoading(false);
        console.log('[AppNavigator] Initializing auth...');

        // Timeout to show slow connection message
        const timer = setTimeout(() => {
            setIsLongLoading(true);
        }, 5000);

        const checkUser = async (user: any) => {
            console.log('[AppNavigator] Checking user:', user?.id);
            if (user) {
                console.log('[AppNavigator] Fetching profile...');
                try {
                    const profile = await getProfile(user.id);
                    console.log('[AppNavigator] Profile fetched:', profile);
                    setIsOnboarded(!!profile?.onboarding_completed);
                } catch (e) {
                    console.error('[AppNavigator] Profile fetch error:', e);
                    setIsOnboarded(null);
                }
            } else {
                console.log('[AppNavigator] No user found.');
                setIsOnboarded(null);
            }
        };

        console.log('[AppNavigator] Calling getSession...');
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('[AppNavigator] Session retrieved:', session ? 'Session exists' : 'No session');
            setSession(session);
            checkUser(session?.user).then(() => {
                console.log('[AppNavigator] checkUser completed.');
                clearTimeout(timer);
                setLoading(false);
            });
        }).catch(err => {
            console.error('[AppNavigator] Error getting session:', err);
            clearTimeout(timer);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        console.log('[AppNavigator] Mounted');
        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('[AppNavigator] Auth state changed:', _event);
            setSession(session);
            if (session?.user) {
                const profile = await getProfile(session.user.id);
                setIsOnboarded(!!profile?.onboarding_completed);
            } else {
                setIsOnboarded(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [initializeAuth]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
                <ActivityIndicator size="large" color="#E91E63" />
                {isLongLoading && (
                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                        <Text style={{ marginBottom: 10, color: '#666' }}>Connection is taking a while...</Text>
                        <Button title="Retry" onPress={initializeAuth} color="#E91E63" />
                        <Button title="Go to Login" onPress={() => setLoading(false)} />
                    </View>
                )}
            </View>
        );
    }

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

