import { sendMessage, getMessages } from '../../services/messaging.service';
import { supabase } from '../../services/supabase.client';

jest.mock('../../services/supabase.client', () => ({
    supabase: {
        from: jest.fn(),
    },
}));

describe('Messaging Service', () => {
    const mockSender = 'user-1';
    const mockRecipient = 'user-2';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should send message successfully', async () => {
        const mockMsg = { id: 'msg-1', content: 'Hello', sender_id: mockSender, recipient_id: mockRecipient };
        const insertMock = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockMsg, error: null })
            })
        });

        (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

        const result = await sendMessage(mockSender, mockRecipient, 'Hello');

        expect(insertMock).toHaveBeenCalledWith({
            sender_id: mockSender,
            recipient_id: mockRecipient,
            content: 'Hello'
        });
        expect(result).toEqual(mockMsg);
    });

    test('should retrieve messages between two users', async () => {
        const mockMsgs = [{ id: '1', content: 'Hi' }, { id: '2', content: 'Hey' }];

        const selectMock = jest.fn().mockReturnValue({
            or: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockMsgs, error: null })
            })
        });

        (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

        const msgs = await getMessages(mockSender, mockRecipient);
        expect(msgs).toEqual(mockMsgs);
        expect(selectMock).toHaveBeenCalledWith('*');
    });
});
