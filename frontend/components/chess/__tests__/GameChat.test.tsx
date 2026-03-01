import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GameChat, { ChatMessage } from '../GameChat';
import { Socket } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');

describe('GameChat', () => {
  let mockSocket: Partial<Socket>;
  let eventHandlers: Record<string, Function>;

  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      gameId: 'game-123',
      sender: {
        id: 'user-1',
        username: 'player1',
        displayName: 'Player One',
        avatarUrl: null,
      },
      message: 'Hello!',
      createdAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '2',
      gameId: 'game-123',
      sender: {
        id: 'user-2',
        username: 'player2',
        displayName: 'Player Two',
        avatarUrl: null,
      },
      message: 'Hi there!',
      createdAt: new Date('2024-01-01T10:01:00Z'),
    },
  ];

  beforeEach(() => {
    eventHandlers = {};

    mockSocket = {
      emit: vi.fn(),
      on: vi.fn((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      }),
      off: vi.fn(),
    };

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Message Display', () => {
    it('should display initial messages (Requirement 19.1)', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
          initialMessages={mockMessages}
        />
      );

      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('should display empty state when no messages', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    it('should display sender name for opponent messages', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
          initialMessages={mockMessages}
        />
      );

      expect(screen.getByText('Player Two')).toBeInTheDocument();
    });

    it('should not display sender name for own messages', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
          initialMessages={mockMessages}
        />
      );

      // "Player One" should not be displayed as it's the current user's message
      expect(screen.queryByText('Player One')).not.toBeInTheDocument();
    });

    it('should receive and display new messages via WebSocket (Requirement 19.1)', async () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      const newMessage: ChatMessage = {
        id: '3',
        gameId: 'game-123',
        sender: {
          id: 'user-2',
          username: 'player2',
          displayName: 'Player Two',
          avatarUrl: null,
        },
        message: 'New message!',
        createdAt: new Date(),
      };

      // Simulate receiving a message
      act(() => {
        eventHandlers['message_received'](newMessage);
      });

      expect(screen.getByText('New message!')).toBeInTheDocument();
    });
  });

  describe('Sending Messages', () => {
    it('should send message via WebSocket when form submitted (Requirement 19.1)', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        gameId: 'game-123',
        message: 'Test message',
      });
    });

    it('should clear input after sending message', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      expect(input.value).toBe('');
    });

    it('should not send empty messages', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.click(sendButton);

      expect(mockSocket.emit).not.toHaveBeenCalledWith('send_message', expect.anything());
    });

    it('should trim whitespace from messages', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(input, { target: { value: '  Test message  ' } });
      fireEvent.click(sendButton);

      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        gameId: 'game-123',
        message: 'Test message',
      });
    });

    it('should enforce 200 character limit (Requirement 19.9)', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
      const longMessage = 'a'.repeat(250);

      fireEvent.change(input, { target: { value: longMessage } });

      // Input should be limited to 200 characters
      expect(input.value.length).toBeLessThanOrEqual(200);
    });

    it('should display character count', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'Hello' } });

      expect(screen.getByText('5/200')).toBeInTheDocument();
    });
  });

  describe('Quick Messages', () => {
    it('should display quick message buttons (Requirement 19.3)', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      expect(screen.getByText('Good luck!')).toBeInTheDocument();
      expect(screen.getByText('Well played!')).toBeInTheDocument();
      expect(screen.getByText('Thanks!')).toBeInTheDocument();
    });

    it('should send quick message when button clicked (Requirement 19.3)', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      const quickMessageButton = screen.getByText('Good luck!');
      fireEvent.click(quickMessageButton);

      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        gameId: 'game-123',
        message: 'Good luck!',
      });
    });
  });

  describe('Typing Indicators', () => {
    it('should send typing_start event when user starts typing (Requirement 19.2)', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'H' } });

      expect(mockSocket.emit).toHaveBeenCalledWith('typing_start', {
        gameId: 'game-123',
      });
    });

    it('should send typing_stop event after 2 seconds of inactivity (Requirement 19.2)', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'Hello' } });

      // Fast-forward time by 2 seconds
      vi.advanceTimersByTime(2000);

      expect(mockSocket.emit).toHaveBeenCalledWith('typing_stop', {
        gameId: 'game-123',
      });
    });

    it('should display typing indicator when opponent is typing (Requirement 19.2)', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      // Simulate opponent typing
      act(() => {
        eventHandlers['user_typing']({
          gameId: 'game-123',
          userId: 'user-2',
          username: 'player2',
        });
      });

      expect(screen.getByText('Opponent is typing')).toBeInTheDocument();
    });

    it('should hide typing indicator when opponent stops typing (Requirement 19.2)', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      // Simulate opponent typing
      act(() => {
        eventHandlers['user_typing']({
          gameId: 'game-123',
          userId: 'user-2',
          username: 'player2',
        });
      });

      expect(screen.getByText('Opponent is typing')).toBeInTheDocument();

      // Simulate opponent stopped typing
      act(() => {
        eventHandlers['user_stopped_typing']({
          gameId: 'game-123',
          userId: 'user-2',
        });
      });

      expect(screen.queryByText('Opponent is typing')).not.toBeInTheDocument();
    });

    it('should not show typing indicator for own typing', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      // Simulate own typing event (should be ignored)
      act(() => {
        eventHandlers['user_typing']({
          gameId: 'game-123',
          userId: 'user-1',
          username: 'player1',
        });
      });

      expect(screen.queryByText('Opponent is typing')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when chat_error event received', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      act(() => {
        eventHandlers['chat_error']({ message: 'Failed to send message' });
      });

      expect(screen.getByText('Failed to send message')).toBeInTheDocument();
    });

    it('should clear error message after 5 seconds', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      act(() => {
        eventHandlers['chat_error']({ message: 'Failed to send message' });
      });

      expect(screen.getByText('Failed to send message')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Failed to send message')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable input and buttons when disabled prop is true', () => {
      render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
          disabled={true}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
      const sendButton = screen.getByRole('button', { name: /send message/i });
      const quickMessageButton = screen.getByText('Good luck!');

      expect(input.disabled).toBe(true);
      expect(sendButton).toBeDisabled();
      expect(quickMessageButton).toBeDisabled();
    });
  });

  describe('WebSocket Cleanup', () => {
    it('should unregister event listeners on unmount', () => {
      const { unmount } = render(
        <GameChat
          socket={mockSocket as Socket}
          gameId="game-123"
          currentUserId="user-1"
        />
      );

      expect(mockSocket.on).toHaveBeenCalledWith('message_received', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user_typing', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user_stopped_typing', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('chat_error', expect.any(Function));

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('message_received', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('user_typing', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('user_stopped_typing', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('chat_error', expect.any(Function));
    });
  });
});
