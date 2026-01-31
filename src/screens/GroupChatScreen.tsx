import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase.client';
import { sendGroupMessage, getGroupMessages } from '../services/group.service';
import { GroupMessage } from '../types/models';
import MessageBubble from '../components/MessageBubble';
import { Ionicons } from '@expo/vector-icons';

export default function GroupChatScreen({ route, navigation }: any) {
    const { group } = route.params; // Expecting { id, name, ... }
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [text, setText] = useState('');
    const [userId, setUserId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUserId(user.id);
                loadMessages();
                subscribeToMessages();
            }
        });

        return () => {
            supabase.removeAllChannels();
        };
    }, []);

    const loadMessages = async () => {
        try {
            const msgs = await getGroupMessages(group.id);
            setMessages(msgs);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToMessages = () => {
        supabase.channel(`group:${group.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'group_messages',
                    filter: `group_id=eq.${group.id}`
                },
                async (payload) => {
                    const newMsg = payload.new as GroupMessage;
                    if (newMsg.sender_id !== userId) {
                        // Fetch sender info if not present (Postgres changes payload might not have joins)
                        // Actually it's better to refetch or use a specific function
                        const { data: senderData } = await supabase
                            .from('profiles')
                            .select('name, profile_photo_url')
                            .eq('id', newMsg.sender_id)
                            .single();

                        const msgWithSender: GroupMessage = {
                            ...newMsg,
                            sender: senderData ? {
                                name: (senderData as any).name,
                                profile_photo_url: (senderData as any).profile_photo_url
                            } : undefined
                        };
                        setMessages(prev => [...prev, msgWithSender]);
                    }
                }
            )
            .subscribe();
    };

    const handleSend = async () => {
        if (!text.trim()) return;
        const content = text.trim();
        setText('');

        try {
            const newMsg = await sendGroupMessage(userId, group.id, content);
            setMessages(prev => [...prev, newMsg]);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#E91E63" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{group.name}</Text>
                    <Text style={styles.headerSub}>{group.category}</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#E91E63" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={({ item }) => (
                        <MessageBubble
                            message={item}
                            isOwn={item.sender_id === userId}
                            showName={true}
                        />
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={setText}
                        placeholder="Message group..."
                        multiline
                    />
                    <TouchableOpacity onPress={handleSend} style={styles.sendBtn} disabled={!text.trim()}>
                        <Ionicons name="send" size={24} color={text.trim() ? "#E91E63" : "#CCC"} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE', flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 8 },
    headerContent: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerSub: { fontSize: 12, color: '#999' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#EEE', alignItems: 'center', backgroundColor: '#FFF' },
    input: { flex: 1, backgroundColor: '#F8F8F8', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 16, maxHeight: 100 },
    sendBtn: { marginLeft: 12, padding: 4 },
});
