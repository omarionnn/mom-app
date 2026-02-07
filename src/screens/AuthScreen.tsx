import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUp, signIn } from '../services/auth.service';
import { UserType } from '../types/models';

export default function AuthScreen() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userType, setUserType] = useState<UserType>('mom');
    const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAuth = async () => {
        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await signUp({
                    email,
                    password,
                    userType,
                    guidelinesAccepted
                });
                if (error) {
                    Alert.alert('Sign Up Failed', error.message);
                } else {
                    Alert.alert('Success', 'Account created! Please check your email for verification.');
                    setIsSignUp(false); // Switch to sign in or wait for auto-login if configured
                }
            } else {
                const { error } = await signIn(email, password);
                if (error) {
                    Alert.alert('Sign In Failed', error.message);
                }
                // Navigation will usually be handled by a listener on auth state in AppNavigator
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.title}>Ezzie's</Text>
                    <Text style={styles.subtitle}>{isSignUp ? 'Join the community' : 'Welcome back'}</Text>

                    <View style={styles.form}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="hello@example.com"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Min 8 chars"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />

                        {isSignUp && (
                            <>
                                <Text style={styles.label}>I am a...</Text>
                                <View style={styles.typeContainer}>
                                    {(['mom', 'expecting', 'caregiver'] as UserType[]).map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.typeButton, userType === type && styles.typeButtonActive]}
                                            onPress={() => setUserType(type)}
                                        >
                                            <Text style={[styles.typeText, userType === type && styles.typeTextActive]}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={styles.checkboxContainer}
                                    onPress={() => setGuidelinesAccepted(!guidelinesAccepted)}
                                >
                                    <View style={[styles.checkbox, guidelinesAccepted && styles.checkboxActive]} />
                                    <Text style={styles.checkboxLabel}>I accept the community guidelines</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchButton}>
                            <Text style={styles.switchText}>
                                {isSignUp ? 'Already have an account? Sign In' : 'New here? Create Account'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF5F7' }, // Soft pink bg
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    title: { fontSize: 32, fontWeight: 'bold', color: '#E91E63', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 32 },
    form: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#E91E63',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8
    },
    label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 16 },
    input: {
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        color: '#333'
    },
    typeContainer: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    typeButton: {
        flex: 1,
        minWidth: '30%',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFC1E3',
        alignItems: 'center',
        backgroundColor: '#FFF'
    },
    typeButtonActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
    typeText: { color: '#E91E63', fontWeight: '600', fontSize: 12 },
    typeTextActive: { color: '#fff' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#E91E63', marginRight: 10 },
    checkboxActive: { backgroundColor: '#E91E63' },
    checkboxLabel: { color: '#666', flex: 1 },
    button: {
        backgroundColor: '#E91E63',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: '#E91E63',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }
    },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    switchButton: { marginTop: 24, alignItems: 'center', padding: 8 },
    switchText: { color: '#E91E63', fontSize: 16, fontWeight: '500' },
});
