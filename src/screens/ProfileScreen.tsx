import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase.client';
import { getProfile, updateProfile } from '../services/profile.service';
import { signOut } from '../services/auth.service';
import { Profile } from '../types/models';

export default function ProfileScreen({ navigation }: any) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const data = await getProfile(user.id);
            if (data) {
                setProfile(data);
                setName(data.name || '');
                setBio(data.bio || '');
                setCity(data.city || '');
            }
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await updateProfile(user.id, {
                    email: user.email,
                    name,
                    bio,
                    city,
                    state: profile.state || '',
                    latitude: profile.latitude || 0,
                    longitude: profile.longitude || 0,
                    profileVisibility: profile.profile_visibility,
                    kids: [],
                    interests: []
                });
                Alert.alert('Success', 'Profile updated!');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: async () => await signOut() }
        ]);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#E91E63" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
                    {saving ? <ActivityIndicator size="small" color="#E91E63" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Hero Section */}
                <View style={styles.hero}>
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: profile?.profile_photo_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editBadge}>
                            <Ionicons name="camera" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.profileName}>{name || 'Your Name'}</Text>
                    <Text style={styles.profileLocation}><Ionicons name="location" size={14} /> {city || 'Location not set'}</Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{profile?.kids?.length || 0}</Text>
                        <Text style={styles.statLabel}>Kids</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{profile?.interests?.length || 0}</Text>
                        <Text style={styles.statLabel}>Interests</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>Member</Text>
                        <Text style={styles.statLabel}>Verified</Text>
                    </View>
                </View>

                {/* Input Sections */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            placeholder="Tell other moms about yourself"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>City</Text>
                        <TextInput
                            style={styles.input}
                            value={city}
                            onChangeText={setCity}
                            placeholder="Your city"
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#E91E63" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0'
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
    saveBtn: { position: 'absolute', right: 16 },
    saveText: { color: '#E91E63', fontWeight: 'bold', fontSize: 16 },

    scrollContent: { paddingBottom: 40 },

    hero: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#FFF' },
    avatarWrapper: { position: 'relative', marginBottom: 16 },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#FCE4EC' },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#E91E63',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF'
    },
    profileName: { fontSize: 24, fontWeight: '900', color: '#333', letterSpacing: -0.5 },
    profileLocation: { fontSize: 14, color: '#999', marginTop: 4, fontWeight: '500' },

    statsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: -25, zIndex: 10 },
    statCard: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2
    },
    statValue: { fontSize: 18, fontWeight: '800', color: '#E91E63' },
    statLabel: { fontSize: 12, color: '#999', fontWeight: '600', marginTop: 2 },

    form: { padding: 20, marginTop: 10 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#333',
        fontWeight: '500'
    },
    textArea: { height: 100, textAlignVertical: 'top' },

    logoutBtn: {
        marginHorizontal: 20,
        marginTop: 10,
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFE4EC'
    },
    logoutText: { color: '#E91E63', fontWeight: 'bold', fontSize: 16 },
    versionText: { textAlign: 'center', color: '#CCC', fontSize: 12, marginTop: 24, fontWeight: '600' }
});

