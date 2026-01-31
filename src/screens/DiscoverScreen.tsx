import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Alert, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { PotentialMatch } from '../types/models';
import { getPotentialMatches, recordSwipe } from '../services/matching.service';
import { supabase } from '../services/supabase.client';
import SwipeCard from '../components/SwipeCard';

export default function DiscoverScreen({ navigation }: any) {
    const [matches, setMatches] = useState<PotentialMatch[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        fetchMatches();

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
    }, []);


    const fetchMatches = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const data = await getPotentialMatches(user.id);
            setMatches(data);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSwipe = async (direction: 'left' | 'right') => {
        const currentProfile = matches[currentIndex];
        if (!currentProfile) return;

        // Optimistic Update
        setCurrentIndex(currentIndex + 1);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const match = await recordSwipe(user.id, currentProfile.id, direction);
                if (match) {
                    Alert.alert(
                        "It's a Match! 🎉",
                        `You and ${currentProfile.name} connected!`,
                        [
                            { text: "Keep Swiping", style: "cancel" },
                            {
                                text: "Say Hello", onPress: () => navigation.navigate('Chat', {
                                    otherUser: {
                                        id: currentProfile.id,
                                        name: currentProfile.name,
                                        profile_photo_url: currentProfile.profile_photo_url
                                    }
                                })
                            }
                        ]
                    );
                }
            }
        } catch (e) {
            console.warn('Swipe failed to record', e);
        }
    };

    const renderContent = () => {
        if (loading) {
            return <View style={styles.center}><ActivityIndicator size="large" color="#E91E63" /></View>;
        }

        return (
            <View style={styles.cardStack}>
                {/* End of Stack Card - Always at the bottom */}
                <View style={[styles.card, styles.endCard]}>
                    <View style={styles.endCardContent}>
                        <Text style={styles.endIcon}>✨</Text>
                        <Text style={styles.emptyText}>You've seen all the moms in your area!</Text>
                        <Text style={styles.subText}>Check back later for new connections or try refreshing.</Text>
                        <TouchableOpacity style={styles.refreshButton} onPress={fetchMatches}>
                            <Text style={styles.refreshButtonText}>Refresh Discover</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Swipable User Cards */}
                {matches.slice(currentIndex, currentIndex + 2).reverse().map((profile) => {
                    const isTop = profile.id === matches[currentIndex].id;
                    return (
                        <SwipeCard
                            key={profile.id}
                            profile={profile}
                            topCard={isTop}
                            onSwipeRight={() => handleSwipe('right')}
                            onSwipeLeft={() => handleSwipe('left')}
                        />
                    );
                })}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Discover</Text>
            </View>

            {/* Main Content */}
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                {renderContent()}
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF'
    },
    title: { fontSize: 24, fontWeight: '800', color: '#E91E63', letterSpacing: -0.5 },
    cardStack: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    card: {
        position: 'absolute',
        width: Dimensions.get('window').width - 24,
        height: Dimensions.get('window').height * 0.7,
        borderRadius: 30,
        backgroundColor: '#f2f2f2',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 5,
    },
    endCard: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    endCardContent: {
        padding: 40,
        alignItems: 'center',
    },
    endIcon: {
        fontSize: 60,
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 12
    },
    subText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30
    },
    refreshButton: {
        backgroundColor: '#FFF0F5',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#E91E63',
    },
    refreshButtonText: {
        color: '#E91E63',
        fontWeight: '700',
        fontSize: 16,
    },
});

