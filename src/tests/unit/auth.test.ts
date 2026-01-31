import { signUp, signIn, signOut, getCurrentUser } from '../../services/auth.service';
import { supabase } from '../../services/supabase.client';

// Mock supabase client
jest.mock('../../services/supabase.client', () => ({
    supabase: {
        auth: {
            signUp: jest.fn(),
            signInWithPassword: jest.fn(),
            signOut: jest.fn(),
            getUser: jest.fn(),
        },
    },
}));

describe('Authentication Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should successfully sign up new user with valid data', async () => {
        const mockUser = { id: '123', email: 'test@example.com' };
        const mockSession = { access_token: 'token' };
        (supabase.auth.signUp as jest.Mock).mockResolvedValue({
            data: { user: mockUser, session: mockSession },
            error: null,
        });

        const result = await signUp({
            email: 'test@example.com',
            password: 'password123',
            userType: 'mom',
            guidelinesAccepted: true,
        });

        expect(result.user).toEqual(mockUser);
        expect(result.session).toEqual(mockSession);
        expect(result.error).toBeNull();
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
            options: expect.objectContaining({
                data: expect.objectContaining({
                    user_type: 'mom'
                })
            })
        });
    });

    test('should reject signup with weak password', async () => {
        const result = await signUp({
            email: 'test@example.com',
            password: 'short', // < 8 chars
            userType: 'mom',
            guidelinesAccepted: true
        });

        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain('Password');
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    test('should reject signup without guidelines acceptance', async () => {
        const result = await signUp({
            email: 'test@example.com',
            password: 'password123',
            userType: 'mom',
            guidelinesAccepted: false,
        });

        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain('Guidelines must be accepted');
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    test('should successfully sign in with correct credentials', async () => {
        const mockUser = { id: '123', email: 'test@example.com' };
        const mockSession = { access_token: 'token' };
        (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
            data: { user: mockUser, session: mockSession },
            error: null,
        });

        const result = await signIn('test@example.com', 'password123');

        expect(result.user).toEqual(mockUser);
        expect(result.session).toEqual(mockSession);
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });
    });

    test('should successfully sign out user', async () => {
        (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
        await signOut();
        expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    test('should retrieve current authenticated user', async () => {
        const mockUser = { id: '123' };
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

        const user = await getCurrentUser();
        expect(user).toEqual(mockUser);
    });
});
