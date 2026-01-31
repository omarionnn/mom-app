import React, { useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PotentialMatch } from '../types/models';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = 0.15 * SCREEN_WIDTH;
const VELOCITY_THRESHOLD = 0.5;

interface SwipeCardProps {
    profile: PotentialMatch;
    onSwipeRight: () => void;
    onSwipeLeft: () => void;
    topCard: boolean;
}

export default function SwipeCard({ profile, onSwipeRight, onSwipeLeft, topCard }: SwipeCardProps) {
    const pan = useRef(new Animated.ValueXY()).current;
    const topCardRef = useRef(topCard);

    useEffect(() => {
        topCardRef.current = topCard;
        if (topCard) {
            pan.setValue({ x: 0, y: 0 });
        }
    }, [topCard]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => topCardRef.current,
            onMoveShouldSetPanResponder: () => topCardRef.current,
            onPanResponderMove: (_, gesture) => {
                if (!topCardRef.current) return;
                pan.setValue({ x: gesture.dx, y: gesture.dy });
            },
            onPanResponderRelease: (_, gesture) => {
                if (!topCardRef.current) return;
                if (gesture.dx > SWIPE_THRESHOLD || gesture.vx > VELOCITY_THRESHOLD) {
                    forceSwipe('right');
                } else if (gesture.dx < -SWIPE_THRESHOLD || gesture.vx < -VELOCITY_THRESHOLD) {
                    forceSwipe('left');
                } else {
                    resetPosition();
                }
            },
        })
    ).current;

    const forceSwipe = (direction: 'left' | 'right') => {
        const x = direction === 'right' ? SCREEN_WIDTH + 150 : -SCREEN_WIDTH - 150;

        // Add haptic feedback
        Haptics.notificationAsync(
            direction === 'right'
                ? Haptics.NotificationFeedbackType.Success
                : Haptics.NotificationFeedbackType.Warning
        );

        Animated.timing(pan, {
            toValue: { x, y: 0 },
            duration: 250,
            useNativeDriver: false
        }).start(() => onSwipeComplete(direction));
    };


    const onSwipeComplete = (direction: 'left' | 'right') => {
        // Trigger the callback first so parent can swap cards
        direction === 'right' ? onSwipeRight() : onSwipeLeft();
        // Don't reset pan immediately to prevent "jump back"
    };

    const resetPosition = () => {
        Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 4,
            useNativeDriver: false
        }).start();
    };

    const getCardStyle = () => {
        const rotate = pan.x.interpolate({
            inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
            outputRange: ['-120deg', '0deg', '120deg'],
        });

        return {
            ...pan.getLayout(),
            transform: [{ rotate }],
        };
    };

    const handlers = panResponder.panHandlers;
    const animatedStyle = topCard ? getCardStyle() : {};

    return (
        <Animated.View style={[styles.card, animatedStyle]} {...handlers}>
            <Image
                source={{ uri: profile.profile_photo_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
                style={styles.image}
            />

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={styles.gradient}
            >
                <View style={styles.textContainer}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{profile.name}</Text>
                        <View style={styles.dot} />
                        <Text style={styles.city}>{profile.city}</Text>
                    </View>

                    <Text style={styles.meta}>{profile.kids.length} {profile.kids.length === 1 ? 'Kid' : 'Kids'}</Text>

                    <View style={styles.interests}>
                        {profile.interests.slice(0, 3).map((int, i) => (
                            <View key={i} style={styles.chip}>
                                <Text style={styles.chipText}>{int}</Text>
                            </View>
                        ))}
                    </View>

                    <Text numberOfLines={2} style={styles.bio}>{profile.bio}</Text>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'absolute',
        width: SCREEN_WIDTH - 24,
        left: 12,
        height: SCREEN_HEIGHT * 0.7,
        borderRadius: 30,
        backgroundColor: '#f2f2f2',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '50%',
        justifyContent: 'flex-end',
    },
    textContainer: {
        padding: 24,
        paddingBottom: 32,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    name: {
        fontSize: 32,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -0.5,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginHorizontal: 10,
        alignSelf: 'center',
    },
    city: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    meta: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 16,
        fontWeight: '600',
    },
    interests: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
    },
    chip: {
        backgroundColor: 'rgba(233, 30, 99, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(233, 30, 99, 0.4)',
    },
    chipText: {
        color: '#FF80AB',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bio: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 22,
        fontWeight: '400',
    }
});

