import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getConversations } from '../services/messaging.service';
import { supabase } from '../services/supabase.client';
import { Conversation } from '../types/models';

export default function MatchesScreen({ navigation }: any) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const data = await getConversations(user.id);
            setConversations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Conversation }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('Chat', { otherUser: item.other_user })}
        >
            <View style={styles.avatarContainer}>
                <Image
                    source={{ uri: item.other_user.profile_photo_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' }}
                    style={styles.avatar}
                />
                <View style={styles.onlineBadge} />
            </View>
            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.other_user.name}</Text>
                    <Text style={styles.time}>{item.last_message ? 'Just now' : ''}</Text>
                </View>
                <Text style={styles.lastMsg} numberOfLines={1}>
                    {item.last_message ? item.last_message.content : 'You matched! Say hello 👋'}
                </Text>
            </View>
            {item.unread_count > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread_count}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Matches</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color="#E91E63" /></View>
            ) : conversations.length === 0 ? (
                <View style={styles.empty}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400' }}
                        style={styles.emptyImage}
                    />
                    <Text style={styles.emptyText}>No connections yet</Text>
                    <Text style={styles.emptySubText}>Keep swiping to find your community!</Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderItem}
                    keyExtractor={item => item.match_id}
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    title: { fontSize: 24, fontWeight: '800', color: '#E91E63', letterSpacing: -0.5 },
    list: { paddingVertical: 8 },
    item: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
    avatarContainer: { position: 'relative' },
    avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 16, backgroundColor: '#F0F0F0' },
    onlineBadge: {
        position: 'absolute',
        right: 16,
        bottom: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#FFF'
    },
    info: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#F8F8F8', paddingBottom: 12 },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    name: { fontSize: 17, fontWeight: '700', color: '#333' },
    time: { fontSize: 12, color: '#BBB', fontWeight: '500' },
    lastMsg: { color: '#888', fontSize: 14, fontWeight: '400' },
    badge: { backgroundColor: '#E91E63', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    badgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyImage: { width: 200, height: 200, borderRadius: 100, marginBottom: 24, opacity: 0.8 },
    emptyText: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 8 },
    emptySubText: { fontSize: 15, color: '#999', textAlign: 'center', lineHeight: 22 }
});

