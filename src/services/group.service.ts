import { supabase } from './supabase.client';
import { Group, GroupMessage } from '../types/models';

export async function getGroups(userId: string, city?: string): Promise<Group[]> {
    let query = supabase.from('groups').select('*');

    if (city) {
        query = query.or(`city.eq.${city},city.is.null`);
    }

    const { data: groups, error } = await query;
    if (error) throw new Error(error.message);

    if (!groups) return [];

    const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

    const memberGroupIds = new Set((memberships as any[])?.map(m => m.group_id));

    return groups.map((g: any) => ({
        ...g,
        member_count: 0,
        is_member: memberGroupIds.has(g.id)
    }));
}

export async function joinGroup(userId: string, groupId: string): Promise<void> {
    const { error } = await supabase
        .from('group_members')
        .insert({ user_id: userId, group_id: groupId, role: 'member' });

    if (error) {
        if (error.code === '23505') return;
        throw new Error(error.message);
    }
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
    const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupId);

    if (error) throw new Error(error.message);
}

export async function createGroup(groupData: Partial<Group>): Promise<Group> {
    const { data, error } = await supabase
        .from('groups')
        .insert(groupData)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function sendGroupMessage(userId: string, groupId: string, content: string): Promise<GroupMessage> {
    const { data, error } = await supabase
        .from('group_messages')
        .insert({
            sender_id: userId,
            group_id: groupId,
            content
        })
        .select('*, sender:profiles(name, profile_photo_url)')
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    const { data, error } = await supabase
        .from('group_messages')
        .select('*, sender:profiles(name, profile_photo_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
}
