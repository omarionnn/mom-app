import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase.client';
import { getGroups, joinGroup, leaveGroup } from '../services/group.service';
import { Group } from '../types/models';

const CATEGORIES = ['All', 'New Moms', 'Toddlers', 'Fitness', 'Playdates', 'Education', 'Self-Care'];

export default function GroupsScreen({ navigation }: any) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const data = await getGroups(user.id);
            setGroups(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleJoin = async (group: Group) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Visual feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            if (group.is_member) {
                await leaveGroup(user.id, group.id);
            } else {
                await joinGroup(user.id, group.id);
            }
            loadGroups();
        } catch (e) {
            console.error(e);
        }
    };


    const handleGroupTap = (group: Group) => {
        if (group.is_member) {
            navigation.navigate('GroupChat', { group });
        } else {
            // Placeholder for details view or just join
            handleToggleJoin(group);
        }
    };

    const renderPopularItem = ({ item }: { item: Group }) => (
        <TouchableOpacity style={styles.popularCard} onPress={() => handleGroupTap(item)}>
            <Image
                source={{ uri: item.cover_photo_url || 'https://images.unsplash.com/photo-1536640712247-c45202d36c2f?w=800' }}
                style={styles.popularCover}
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.popularGradient}>
                <Text style={styles.popularName}>{item.name}</Text>
                <Text style={styles.popularStats}>{item.member_count} active moms</Text>
            </LinearGradient>
        </TouchableOpacity>
    );

    const renderItem = ({ item }: { item: Group }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleGroupTap(item)}>
            <Image
                source={{ uri: item.cover_photo_url || 'https://images.unsplash.com/photo-1484981138541-3d074aa97716?w=800' }}
                style={styles.cover}
            />
            <View style={styles.cardContent}>
                <View style={styles.cardMain}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.tagRow}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{item.category}</Text>
                        </View>
                        <Text style={styles.memberCount}>{item.member_count} Members</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.btn, item.is_member ? styles.btnOutline : styles.btnSolid]}
                    onPress={() => handleToggleJoin(item)}
                >
                    <Text style={[styles.btnText, item.is_member ? styles.btnTextOutline : styles.btnTextSolid]}>
                        {item.is_member ? 'Joined' : 'Join'}
                    </Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Communities</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color="#E91E63" /></View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Category Selector */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoryScroll}
                        contentContainerStyle={styles.categoryContent}
                    >
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Popular Near You</Text>
                    </View>
                    <FlatList
                        horizontal
                        data={groups.slice(0, 3)}
                        renderItem={renderPopularItem}
                        keyExtractor={item => 'pop-' + item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.popularList}
                    />

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Top Communities</Text>
                    </View>
                    <FlatList
                        data={groups}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        scrollEnabled={false}
                        contentContainerStyle={styles.list}
                    />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    header: { padding: 16, alignItems: 'center', backgroundColor: '#FFF' },
    title: { fontSize: 24, fontWeight: '800', color: '#E91E63' },

    categoryScroll: { marginVertical: 12 },
    categoryContent: { paddingHorizontal: 16, gap: 10 },
    catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEE' },
    catChipActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
    catText: { fontSize: 14, fontWeight: '600', color: '#666' },
    catTextActive: { color: '#FFF' },

    sectionHeader: { paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#333' },

    popularList: { paddingHorizontal: 16, gap: 12 },
    popularCard: { width: 220, height: 140, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EEE' },
    popularCover: { width: '100%', height: '100%' },
    popularGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', justifyContent: 'flex-end', padding: 12 },
    popularName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    popularStats: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

    list: { padding: 16, paddingTop: 0 },
    card: { backgroundColor: '#FFF', marginBottom: 20, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    cover: { height: 150, width: '100%' },
    cardContent: { padding: 16, flexDirection: 'row', alignItems: 'flex-end' },
    cardMain: { flex: 1 },
    name: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 4 },
    desc: { fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 20 },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tag: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#FCE4EC', borderRadius: 8 },
    tagText: { color: '#E91E63', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    memberCount: { fontSize: 12, color: '#999', fontWeight: '500' },

    btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 80, alignItems: 'center' },
    btnSolid: { backgroundColor: '#E91E63' },
    btnOutline: { borderWidth: 1, borderColor: '#E91E63' },
    btnText: { fontWeight: '700', fontSize: 14 },
    btnTextSolid: { color: '#FFF' },
    btnTextOutline: { color: '#E91E63' }
});

