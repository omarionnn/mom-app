import { getGroups, joinGroup } from '../../services/group.service';
import { supabase } from '../../services/supabase.client';

jest.mock('../../services/supabase.client', () => ({
    supabase: {
        from: jest.fn(),
    },
}));

describe('Group Service', () => {
    const mockUserId = 'user-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should fetch groups and mark membership', async () => {
        const mockGroups = [{ id: 'g1', name: 'Moms' }, { id: 'g2', name: 'Dads' }];
        const mockMemberships = [{ group_id: 'g1' }]; // User is member of g1

        const selectGroupsMock = jest.fn().mockReturnValue({
            or: jest.fn().mockResolvedValue({ data: mockGroups, error: null })
        });

        const selectMembersMock = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null })
            })
        });

        (supabase.from as jest.Mock).mockImplementation((table) => {
            if (table === 'groups') return { select: selectGroupsMock };
            if (table === 'group_members') return selectMembersMock();
            return {};
        });

        const groups = await getGroups(mockUserId, 'NY');

        expect(groups).toHaveLength(2);
        expect(groups.find(g => g.id === 'g1')?.is_member).toBe(true);
        expect(groups.find(g => g.id === 'g2')?.is_member).toBe(false);
    });

    test('should join group successfully', async () => {
        const insertMock = jest.fn().mockResolvedValue({ error: null });
        (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

        await joinGroup(mockUserId, 'g2');

        expect(insertMock).toHaveBeenCalledWith({ user_id: mockUserId, group_id: 'g2' });
    });
});
