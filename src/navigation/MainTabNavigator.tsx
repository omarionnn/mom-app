import React, { useState, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase.client';
import { getTotalUnreadCount } from '../services/messaging.service';
import DiscoverScreen from '../screens/DiscoverScreen';
import GroupsScreen from '../screens/GroupsScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    const insets = useSafeAreaInsets();
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const count = await getTotalUnreadCount(user.id);
                setUnreadCount(count);
            }
        } catch (e) {
            console.error('[MainTabNavigator] Error fetching unread count:', e);
        }
    }, []);

    useEffect(() => {
        // Fetch initial count
        fetchUnreadCount();

        // Subscribe to new messages to update badge in real-time
        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const subscription = supabase
                .channel('unread-messages')
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen for INSERT, UPDATE, DELETE
                        schema: 'public',
                        table: 'messages',
                        filter: `recipient_id=eq.${user.id}`
                    },
                    () => {
                        // Refresh unread count when messages change
                        fetchUnreadCount();
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        };

        setupSubscription();

        // Also refresh every time the navigator mounts (e.g., returning to app)
        const interval = setInterval(fetchUnreadCount, 30000); // Refresh every 30s as backup
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;

                    if (route.name === 'Discover') {
                        iconName = focused ? 'sparkles' : 'sparkles-outline';
                    } else if (route.name === 'Communities') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'Matches') {
                        iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#E91E63',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
                tabBarStyle: {
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
                    paddingTop: 5,
                    height: 60 + (insets.bottom > 0 ? insets.bottom - 10 : 0),
                    borderTopWidth: 1,
                    borderTopColor: '#EEE',
                    backgroundColor: '#FFF',
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            })}
        >
            <Tab.Screen name="Discover" component={DiscoverScreen} />
            <Tab.Screen name="Communities" component={GroupsScreen} />
            <Tab.Screen
                name="Matches"
                component={MatchesScreen}
                options={{
                    tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
                    tabBarBadgeStyle: {
                        backgroundColor: '#E91E63',
                        fontSize: 10,
                        fontWeight: 'bold',
                    }
                }}
            />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
