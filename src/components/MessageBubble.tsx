import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message, GroupMessage } from '../types/models';

interface MessageBubbleProps {
    message: Message | GroupMessage;
    isOwn: boolean;
    showName?: boolean;
}

export default function MessageBubble({ message, isOwn, showName }: MessageBubbleProps) {
    const senderName = (message as any).sender?.name;

    return (
        <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
            {showName && !isOwn && senderName && (
                <Text style={styles.senderName}>{senderName}</Text>
            )}
            <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
                <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>
                    {message.content}
                </Text>
            </View>
            <Text style={styles.time}>
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 12 },
    ownContainer: { alignItems: 'flex-end' },
    otherContainer: { alignItems: 'flex-start' },
    bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
    ownBubble: { backgroundColor: '#E91E63', borderBottomRightRadius: 2 },
    otherBubble: { backgroundColor: '#F0F0F0', borderBottomLeftRadius: 2 },
    text: { fontSize: 16 },
    ownText: { color: '#FFF' },
    otherText: { color: '#333' },
    senderName: { fontSize: 12, fontWeight: '700', color: '#E91E63', marginBottom: 2, marginLeft: 4 },
    time: { fontSize: 10, color: '#999', marginTop: 4, marginHorizontal: 4 }
});
