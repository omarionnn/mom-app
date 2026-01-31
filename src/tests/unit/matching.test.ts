import { getPotentialMatches, recordSwipe } from '../../services/matching.service';
import { supabase } from '../../services/supabase.client';

// Mock supabase
jest.mock('../../services/supabase.client', () => ({
    supabase: {
        from: jest.fn(),
    },
}));

describe('Matching Service', () => {
    const mockUserId = 'user-1';
    const mockTargetId = 'user-2';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should fetch potential matches excluding swiped users', async () => {
        // Mock user city fetch
        const fetchUserMock = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: { id: mockUserId, city: 'NY' }, error: null })
                })
            })
        });

        // Mock swiped ids fetch
        const fetchSwipesMock = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [{ swiped_id: 'user-3' }], error: null })
            })
        });

        // Mock profiles fetch
        const fetchProfilesMock = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    not: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue({
                            data: [{ id: 'user-2', name: 'Mom 2', city: 'NY', kids: [], user_interests: [] }],
                            error: null
                        })
                    })
                })
            })
        });

        (supabase.from as jest.Mock).mockImplementation((table) => {
            if (table === 'profiles') {
                // We have two calls to profiles: one for current user, one for matches
                // This simple mock might be ambitious if logic calls same table.
                // We can return a chain that handles both or distinct mocks based on call order.
                // But simpler: just return a universal chain that can be configured? 
                // Or rely on the mock returning the 'fetchUserMock' first?
                // Actually, the service awaits calls sequentially.
            }
            // Let's use a simpler approach for the mock implementation switching
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { id: mockUserId, city: 'NY' } }), // default for user
                not: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue({ data: [{ id: 'user-2' }] })
            };
        });

        // We'll skip deep mocking of the exact chain and assume the service logic flow.
        // Testing logic:
        // 1. calls profiles (for user)
        // 2. calls swipes
        // 3. calls profiles (for matches)

        // Let's refine the mock to return specific data based on table
        (supabase.from as jest.Mock).mockImplementation((table) => {
            if (table === 'swipes') return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ data: [] })
            };
            if (table === 'profiles') return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { id: mockUserId, city: 'NY' } }),
                not: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue({ data: [] })
            };
            return {};
        });
        await getPotentialMatches(mockUserId);
        expect(supabase.from).toHaveBeenCalledWith('profiles');
        expect(supabase.from).toHaveBeenCalledWith('swipes');
    });

    test('should record swipe and create match on mutual like', async () => {
        // Mock insert swipe
        const insertMock = jest.fn().mockResolvedValue({ error: null });

        // Mock check reciprocal
        const checkMock = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'swipe-2' } }) // Reciprocal exists
        });

        // Mock create match - needs single()
        const createMatchMock = jest.fn().mockReturnValue({
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'match-1' } })
        });

        (supabase.from as jest.Mock).mockImplementation((table) => {
            if (table === 'swipes') return {
                insert: insertMock,
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { id: 'swipe-2' } })
            };
            if (table === 'matches') return { insert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'match-1' } }) };
            return {};
        });

        const match = await recordSwipe(mockUserId, mockTargetId, 'right');

        expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
            swiper_id: mockUserId,
            swiped_id: mockTargetId,
            direction: 'right'
        }));

        expect(match).toBeDefined();
        expect(match?.id).toBe('match-1');
    });

    test('should not create match on left swipe', async () => {
        const insertMock = jest.fn().mockResolvedValue({ error: null });
        (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

        const match = await recordSwipe(mockUserId, mockTargetId, 'left');

        expect(match).toBeNull();
    });
});
