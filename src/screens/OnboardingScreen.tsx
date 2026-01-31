import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentLocation, requestLocationPermission, reverseGeocode } from '../services/location.service';
import { updateProfile, completeOnboarding, uploadProfilePhoto } from '../services/profile.service';
import { supabase } from '../services/supabase.client';
import { Kid } from '../types/models';

const INTERESTS_LIST = [
    'Working mom', 'Stay-at-home mom', 'Homeschooling', 'Single parent',
    'Fitness & wellness', 'Arts & crafts', 'Outdoor activities', 'Book club',
    'Cooking/baking', 'Career-focused'
];

export default function OnboardingScreen({ navigation }: any) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [kids, setKids] = useState<Partial<Kid>[]>([{ age: 0 }]);
    const [interests, setInterests] = useState<string[]>([]);
    const [location, setLocation] = useState({ city: '', state: '', lat: 0, lng: 0 });
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<'public' | 'matches_only' | 'private'>('public');

    const addKid = () => setKids([...kids, { age: 0 }]);
    const removeKid = (index: number) => setKids(kids.filter((_, i) => i !== index));
    const updateKidAge = (index: number, age: string) => {
        const newKids = [...kids];
        newKids[index].age = parseInt(age) || 0;
        setKids(newKids);
    };

    const toggleInterest = (interest: string) => {
        if (interests.includes(interest)) {
            setInterests(interests.filter(i => i !== interest));
        } else {
            setInterests([...interests, interest]);
        }
    };

    const handleLocation = async () => {
        setLoading(true);
        try {
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                Alert.alert('Permission denied', 'Please enter your city manually.');
                setLoading(false);
                return;
            }

            const coords = await getCurrentLocation();
            if (coords) {
                const address = await reverseGeocode(coords.latitude, coords.longitude);
                if (address) {
                    setLocation({
                        lat: coords.latitude,
                        lng: coords.longitude,
                        city: address.city,
                        state: address.state
                    });
                }
            }
        } catch (e) {
            Alert.alert('Error', 'Could not get location.');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Upload photo if exists
            let uploadedPhotoUrl = '';
            if (photoUri) {
                uploadedPhotoUrl = await uploadProfilePhoto(user.id, photoUri) || '';
            }

            // Update Profile using Service (Consolidated)
            await updateProfile(user.id, {
                email: user.email,
                name,
                bio,
                city: location.city,
                state: location.state,
                latitude: location.lat,
                longitude: location.lng,
                profileVisibility: visibility,
                kids: kids as Kid[],
                interests,
                onboardingCompleted: true
            });

            // Refresh session to trigger AppNavigator's onAuthStateChange listener
            // Using a timeout to give Supabase DB a moment to propagate if needed
            setTimeout(async () => {
                try {
                    await supabase.auth.refreshSession();
                } catch (e) {
                    console.error('Session refresh failed', e);
                }
            }, 500);

        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const renderStepContent = () => {
        switch (step) {
            case 1: // Kids
                return (
                    <View>
                        <Text style={styles.header}>Tell us about your kids</Text>
                        <Text style={styles.subHeader}>This helps us find moms with kids similar in age.</Text>
                        {kids.map((kid, index) => (
                            <View key={index} style={styles.kidRow}>
                                <Text style={styles.label}>Kid {index + 1} Age:</Text>
                                <TextInput
                                    style={styles.ageInput}
                                    keyboardType="number-pad"
                                    value={kid.age?.toString()}
                                    onChangeText={(val) => updateKidAge(index, val)}
                                />
                                {index > 0 && (
                                    <TouchableOpacity onPress={() => removeKid(index)}>
                                        <Text style={styles.removeText}>Remove</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        <TouchableOpacity onPress={addKid} style={styles.addButton}>
                            <Text style={styles.addButtonText}>+ Add another kid</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 2: // Interests
                return (
                    <View>
                        <Text style={styles.header}>What are you interested in?</Text>
                        <Text style={styles.subHeader}>Select at least one to find common ground.</Text>
                        <View style={styles.chipsContainer}>
                            {INTERESTS_LIST.map(item => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.chip, interests.includes(item) && styles.chipActive]}
                                    onPress={() => toggleInterest(item)}
                                >
                                    <Text style={[styles.chipText, interests.includes(item) && styles.chipTextActive]}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 3: // Location
                return (
                    <View>
                        <Text style={styles.header}>Where are you located?</Text>
                        <Text style={styles.subHeader}>We match you with moms in your city.</Text>

                        <Text style={styles.label}>City</Text>
                        <TextInput
                            style={styles.input}
                            value={location.city}
                            onChangeText={(t) => setLocation({ ...location, city: t })}
                            placeholder="e.g. San Francisco"
                            autoCorrect={false}
                        />
                        <Text style={styles.label}>State / Region</Text>
                        <TextInput
                            style={styles.input}
                            value={location.state}
                            onChangeText={(t) => setLocation({ ...location, state: t })}
                            placeholder="e.g. CA"
                            autoCorrect={false}
                        />

                        <TouchableOpacity style={styles.locationButtonSmall} onPress={handleLocation}>
                            <Text style={styles.locationButtonTextSmall}>📍 Auto-detect via GPS (Optional)</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 4: // Profile
                return (
                    <View>
                        <Text style={styles.header}>Create your Profile</Text>

                        <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={styles.photo} />
                            ) : (
                                <View style={styles.photoPlaceholder}>
                                    <Text style={styles.photoText}>Tap to add photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.label}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Your name"
                        />

                        <Text style={styles.label}>Bio (Max 500 chars)</Text>
                        <TextInput
                            style={[styles.input, { height: 100 }]}
                            multiline
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell us a little about yourself..."
                            maxLength={500}
                        />
                    </View>
                );
            case 5: // Privacy
                return (
                    <View>
                        <Text style={styles.header}>Privacy Settings</Text>
                        <Text style={styles.subHeader}>Control who sees your profile.</Text>

                        {['public', 'matches_only', 'private'].map((opt) => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.radioOption, visibility === opt && styles.radioActive]}
                                onPress={() => setVisibility(opt as any)}
                            >
                                <Text style={[styles.radioText, visibility === opt && styles.radioTextActive]}>
                                    {opt === 'public' && 'Public (Visible to all)'}
                                    {opt === 'matches_only' && 'Matches Only (After connecting)'}
                                    {opt === 'private' && 'Private (Not discoverable)'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            default: return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {renderStepContent()}

                <View style={styles.footer}>
                    {step > 1 && (
                        <TouchableOpacity onPress={prevStep} style={styles.navButtonSecondary}>
                            <Text style={styles.navTextSecondary}>Back</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={step === 5 ? handleFinish : nextStep}
                        style={[styles.navButton, step === 1 && { flex: 1 }]} // Full width if no back button
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <Text style={styles.navText}>{step === 5 ? 'Finish Profile' : 'Next'}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    content: { padding: 24, flexGrow: 1 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#E91E63', marginBottom: 8 },
    subHeader: { fontSize: 16, color: '#666', marginBottom: 24 },
    kidRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    label: { fontSize: 16, fontWeight: '600', color: '#333', marginRight: 10, marginTop: 10 },
    ageInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, width: 60, textAlign: 'center' },
    removeText: { color: 'red', marginLeft: 16 },
    addButton: { marginTop: 10, padding: 10 },
    addButtonText: { color: '#E91E63', fontWeight: 'bold' },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#EEE' },
    chipActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
    chipText: { color: '#333' },
    chipTextActive: { color: '#FFF' },
    locationButtonSmall: { marginTop: 10, padding: 10, alignSelf: 'center' },
    locationButtonTextSmall: { color: '#E91E63', fontWeight: 'bold', fontSize: 14 },
    input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16, backgroundColor: '#FAFAFA' },
    photoContainer: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: 24, overflow: 'hidden', backgroundColor: '#F0F0F0' },
    photo: { width: '100%', height: '100%' },
    photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    photoText: { color: '#999', fontSize: 12 },
    radioOption: { padding: 16, borderWidth: 1, borderColor: '#EEE', borderRadius: 12, marginBottom: 12 },
    radioActive: { borderColor: '#E91E63', backgroundColor: '#FFF0F5' },
    radioText: { fontSize: 16, color: '#333' },
    radioTextActive: { color: '#E91E63', fontWeight: '600' },
    footer: { flexDirection: 'row', marginTop: 40, justifyContent: 'space-between', gap: 16 },
    navButton: { flex: 1, backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
    navButtonSecondary: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
    navText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    navTextSecondary: { color: '#E91E63', fontWeight: 'bold', fontSize: 16 },
});
