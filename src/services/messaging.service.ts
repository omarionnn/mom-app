import { supabase } from './supabase.client';
import { Message, Conversation } from '../types/models';

/**
 * Get total count of unread messages for a user across all conversations.
 * Used to display badge on Matches tab.
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .is('read_at', null);

    if (error) {
        console.error('[messaging.service] Error getting unread count:', error);
        return 0;
    }
    return count || 0;
}

export async function sendMessage(senderId: string, recipientId: string, content: string): Promise<Message> {
    if (content.length > 2000) throw new Error('Message too long');

    const { data, error } = await supabase
        .from('messages')
        .insert({
            sender_id: senderId,
            recipient_id: recipientId,
            content
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
    // 1. Get all matches for user
    const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
      id,
      user1:profiles!user1_id(id, name, profile_photo_url),
      user2:profiles!user2_id(id, name, profile_photo_url)
    `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (matchesError) throw new Error(matchesError.message);
    if (!matches) return [];

    // 2. Fetch last message and unread count for each match
    // This is N+1 but acceptable for MVP with small lists. 
    // Optimized way: Use a SQL view or specialized query.
    const conversations: Conversation[] = [];

    for (const match of matches) {
        const isUser1 = match.user1.id === userId;
        const otherUser = isUser1 ? match.user2 : match.user1;

        // Get last message
        const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},recipient_id.eq.${userId})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // Get unread count (messages sent BY other user, TO me, NOT read)
        const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', otherUser.id)
            .eq('recipient_id', userId)
            .is('read_at', null);

        // Only include if there's activity? Or include empty matches? 
        // Spec says "See message history... on match list". Usually empty matches are shown too.
        conversations.push({
            match_id: match.id,
            other_user: otherUser,
            last_message: lastMsg || undefined,
            unread_count: count || 0
        });
    }

    // Sort by last message time
    return conversations.sort((a, b) => {
        const timeA = a.last_message?.created_at || '';
        const timeB = b.last_message?.created_at || '';
        return timeB.localeCompare(timeA);
    });
}

export async function getMessages(userId: string, otherUserId: string): Promise<Message[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true }); // Chat usually loads oldest first or reverse. Let's do chronological.

    if (error) throw new Error(error.message);
    return data || [];
}

export async function markAsRead(messageId: string): Promise<void> {
    await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
}

/**
 * Mark all unread messages from a specific sender to the recipient as read.
 * Called when entering a chat to clear the unread badge.
 */
export async function markMessagesAsRead(senderId: string, recipientId: string): Promise<void> {
    const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', senderId)
        .eq('recipient_id', recipientId)
        .is('read_at', null);

    if (error) {
        console.error('[messaging.service] Error marking messages as read:', error);
    }
}

