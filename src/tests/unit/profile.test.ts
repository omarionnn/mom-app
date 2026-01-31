import { updateProfile, completeOnboarding, uploadProfilePhoto } from '../../services/profile.service';
import { supabase } from '../../services/supabase.client';

// Mock supabase client
jest.mock('../../services/supabase.client', () => ({
    supabase: {
        from: jest.fn(() => ({
            update: jest.fn(() => ({
                eq: jest.fn(() => ({
                    select: jest.fn(() => ({
                        single: jest.fn()
                    }))
                }))
            })),
            insert: jest.fn(),
            select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn() })) })),
        })),
    },
}));

describe('Profile Service', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should update profile with valid data', async () => {
        const mockProfileData = {
            name: 'Jane Doe',
            bio: 'Loving mom',
            city: 'New York',
            state: 'NY',
            latitude: 40.7128,
            longitude: -74.0060,
            profileVisibility: 'public' as const,
            kids: [{ age: 5 }, { age: 2 }],
            interests: ['fitness', 'cooking']
        };

        const mockSupabaseResponse = {
            data: { id: mockUserId, ...mockProfileData },
            error: null
        };

        // Setup complex mock chain for "update"
        const updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue(mockSupabaseResponse)
                })
            })
        });

        const insertMock = jest.fn().mockResolvedValue({ error: null });

        (supabase.from as jest.Mock).mockImplementation((table) => {
            if (table === 'profiles') return { update: updateMock, select: jest.fn() };
            if (table === 'kids') return { insert: insertMock };
            if (table === 'user_interests') return { insert: insertMock };
            return {};
        });

        await updateProfile(mockUserId, mockProfileData);

        // Check Profile Update interaction
        expect(supabase.from).toHaveBeenCalledWith('profiles');
        expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Jane Doe',
            city: 'New York'
        }));

        // Check Kids Insertion
        expect(supabase.from).toHaveBeenCalledWith('kids');
        expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ user_id: mockUserId, age: 5 })
        ]));

        // Check Interests Insertion
        expect(supabase.from).toHaveBeenCalledWith('user_interests');
        expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ user_id: mockUserId, interest: 'fitness' })
        ]));
    });

    test('should mark onboarding as completed', async () => {
        const updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
        });

        (supabase.from as jest.Mock).mockImplementation((table) => {
            if (table === 'profiles') return { update: updateMock };
            return {};
        });

        await completeOnboarding(mockUserId);

        expect(updateMock).toHaveBeenCalledWith({ onboarding_completed: true });
    });
});
