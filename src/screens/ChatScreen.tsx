import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase.client';
import { sendMessage, getMessages, markMessagesAsRead } from '../services/messaging.service';
import { Message } from '../types/models';
import MessageBubble from '../components/MessageBubble';

export default function ChatScreen({ route, navigation }: any) {
    const { otherUser } = route.params; // Expecting { id, name, ... }
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [userId, setUserId] = useState<string>('');
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUserId(user.id);
                loadMessages(user.id);
                subscribeToMessages(user.id);
                // Mark all messages from this user as read when entering chat
                markMessagesAsRead(otherUser.id, user.id);
            }
        });

        return () => {
            supabase.removeAllChannels();
        };
    }, []);

    const loadMessages = async (currentUserId: string) => {
        try {
            const msgs = await getMessages(currentUserId, otherUser.id);
            setMessages(msgs);
        } catch (e) {
            console.error(e);
        }
    };

    const subscribeToMessages = (currentUserId: string) => {
        supabase.channel(`chat:${currentUserId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `recipient_id=eq.${currentUserId}`
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    if (newMsg.sender_id === otherUser.id) {
                        setMessages(prev => [...prev, newMsg]);
                    }
                }
            )
            .subscribe();
    };

    const handleSend = async () => {
        if (!text.trim()) return;
        const content = text.trim();
        setText(''); // clear immediately for UX

        try {
            const newMsg = await sendMessage(userId, otherUser.id, content);
            setMessages(prev => [...prev, newMsg]);
        } catch (e) {
            console.error(e);
            // TODO: Show error and restore text
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{otherUser.name}</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={({ item }) => <MessageBubble message={item} isOwn={item.sender_id === userId} />}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={setText}
                        placeholder="Type a message..."
                        multiline
                    />
                    <TouchableOpacity onPress={handleSend} style={styles.sendBtn} disabled={!text.trim()}>
                        <Text style={styles.sendText}>Send</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE', flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 16 },
    backText: { fontSize: 24, color: '#E91E63' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    list: { padding: 16 },
    inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#EEE', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#F8F8F8', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 16, maxHeight: 100 },
    sendBtn: { marginLeft: 12, padding: 8 },
    sendText: { color: '#E91E63', fontWeight: 'bold', fontSize: 16 }
});
