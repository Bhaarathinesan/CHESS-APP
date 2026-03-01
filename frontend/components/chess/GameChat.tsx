'use client';

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ChatMessage {
  id: string;
  gameId: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  message: string;
  createdAt: Date | string;
}

export interface GameChatProps {
  socket: Socket | null;
  gameId: string;
  currentUserId: string;
  initialMessages?: ChatMessage[];
  disabled?: boolean;
  onToggleChat?: (enabled: boolean) => void;
  chatEnabled?: boolean;
}

/**
 * GameChat component for in-game chat functionality
 * Features:
 * - Display message history (Requirement 19.1)
 * - Send text messages via WebSocket (Requirement 19.1)
 * - Show typing indicators (Requirement 19.2)
 * - Quick message buttons (Requirement 19.3)
 * - 200 character limit (Requirement 19.9)
 * - Profanity filtering (Requirement 19.6)
 * - Rate limiting (Requirement 19.10)
 * - Chat disable options (Requirements 19.4, 19.5)
 * - Report functionality (Requirement 19.7)
 * 
 * WebSocket Events:
 * - send_message: Send a chat message
 * - typing_start: Notify opponent user is typing
 * - typing_stop: Notify opponent user stopped typing
 * - message_received: Receive new messages
 * - user_typing: Opponent started typing
 * - user_stopped_typing: Opponent stopped typing
 * - chat_error: Error handling
 * - report_message: Report inappropriate message
 * - toggle_game_chat: Toggle chat for this game
 */
export default function GameChat({
  socket,
  gameId,
  currentUserId,
  initialMessages = [],
  disabled = false,
  onToggleChat,
  chatEnabled = true,
}: GameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [opponentTyping, setOpponentTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number;
    resetInSeconds: number;
  } | null>(null);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_MESSAGE_LENGTH = 200;

  // Quick message options (Requirement 19.3)
  const quickMessages = [
    'Good luck!',
    'Well played!',
    'Thanks!',
  ];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!socket || !gameId) return;

    // Join the chat room
    socket.emit('join_game', { gameId });

    // Listen for incoming messages (Requirement 19.1)
    const handleMessageReceived = (data: ChatMessage) => {
      if (data.gameId === gameId) {
        setMessages((prev) => [...prev, data]);
      }
    };

    // Listen for typing indicators (Requirement 19.2)
    const handleUserTyping = (data: { gameId: string; userId: string; username: string }) => {
      if (data.gameId === gameId && data.userId !== currentUserId) {
        setOpponentTyping(true);
      }
    };

    const handleUserStoppedTyping = (data: { gameId: string; userId: string }) => {
      if (data.gameId === gameId && data.userId !== currentUserId) {
        setOpponentTyping(false);
      }
    };

    // Listen for errors
    const handleChatError = (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('chat_error', handleChatError);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('chat_error', handleChatError);
    };
  }, [socket, gameId, currentUserId]);

  // Handle typing indicator with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Enforce character limit (Requirement 19.9)
    if (value.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    setInputValue(value);

    if (!socket || !gameId) return;

    // Send typing_start event if not already typing
    if (!isTyping && value.length > 0) {
      socket.emit('typing_start', { gameId });
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to send typing_stop after 2 seconds of inactivity
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        if (socket) {
          socket.emit('typing_stop', { gameId });
          setIsTyping(false);
        }
      }, 2000);
    } else {
      // If input is empty, immediately send typing_stop
      socket.emit('typing_stop', { gameId });
      setIsTyping(false);
    }
  };

  // Send message
  const sendMessage = (message: string) => {
    if (!socket || !gameId || !message.trim() || disabled) return;

    const trimmedMessage = message.trim();

    // Validate message length
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setError(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Send message via WebSocket (Requirement 19.1)
    socket.emit('send_message', {
      gameId,
      message: trimmedMessage,
    });

    // Clear input and typing state
    setInputValue('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping) {
      socket.emit('typing_stop', { gameId });
      setIsTyping(false);
    }

    // Focus back on input
    inputRef.current?.focus();
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Handle quick message click (Requirement 19.3)
  const handleQuickMessage = (message: string) => {
    sendMessage(message);
  };

  // Format timestamp
  const formatTime = (timestamp: Date | string): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Report a message (Requirement 19.7)
  const reportMessage = (messageId: string) => {
    if (!socket || !gameId) return;

    const reason = prompt('Please provide a reason for reporting this message:');
    if (!reason || !reason.trim()) {
      return;
    }

    socket.emit('report_message', {
      messageId,
      reason: reason.trim(),
    });

    setReportingMessageId(null);
    alert('Message reported successfully. Our moderators will review it.');
  };

  // Toggle chat for this game (Requirement 19.4)
  const toggleChatForGame = () => {
    if (!socket || !gameId) return;

    const newEnabled = !chatEnabled;
    socket.emit('toggle_game_chat', {
      gameId,
      enabled: newEnabled,
    });

    if (onToggleChat) {
      onToggleChat(newEnabled);
    }
  };

  // Fetch rate limit info
  const fetchRateLimitInfo = () => {
    if (!socket || !gameId) return;

    socket.emit('get_rate_limit_info', { gameId });
  };

  // Listen for rate limit info
  useEffect(() => {
    if (!socket) return;

    const handleRateLimitInfo = (data: {
      maxMessages: number;
      remaining: number;
      resetInSeconds: number;
    }) => {
      setRateLimitInfo({
        remaining: data.remaining,
        resetInSeconds: data.resetInSeconds,
      });
    };

    socket.on('rate_limit_info', handleRateLimitInfo);

    return () => {
      socket.off('rate_limit_info', handleRateLimitInfo);
    };
  }, [socket]);

  // Fetch rate limit info on mount and after sending messages
  useEffect(() => {
    fetchRateLimitInfo();
  }, [socket, gameId, messages.length]);

  return (
    <div className="game-chat flex flex-col h-full bg-background border border-border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-foreground-secondary" />
          <h3 className="text-sm font-semibold text-foreground">Chat</h3>
        </div>
        <div className="flex items-center gap-2">
          {rateLimitInfo && rateLimitInfo.remaining < 3 && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              {rateLimitInfo.remaining} msgs left
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleChatForGame}
            className="text-xs"
            title={chatEnabled ? 'Disable chat for this game' : 'Enable chat for this game'}
          >
            {chatEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-foreground-secondary">
            No messages yet
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwnMessage = msg.sender.id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-2 ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background-secondary text-foreground'
                    }`}
                  >
                    {!isOwnMessage && (
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-xs font-semibold opacity-80">
                          {msg.sender.displayName}
                        </div>
                        <button
                          onClick={() => reportMessage(msg.id)}
                          className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                          title="Report message"
                        >
                          ⚠️
                        </button>
                      </div>
                    )}
                    <div className="text-sm break-words">{msg.message}</div>
                    <div
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'opacity-80' : 'opacity-60'
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Typing Indicator (Requirement 19.2) */}
        {opponentTyping && (
          <div className="flex items-center gap-2 text-sm text-foreground-secondary italic">
            <div className="flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
                •
              </span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
                •
              </span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
                •
              </span>
            </div>
            <span>Opponent is typing</span>
          </div>
        )}
      </div>

      {/* Quick Messages (Requirement 19.3) */}
      <div className="px-3 py-2 border-t border-border">
        <div className="flex flex-wrap gap-2">
          {quickMessages.map((msg) => (
            <Button
              key={msg}
              variant="ghost"
              size="sm"
              onClick={() => handleQuickMessage(msg)}
              disabled={disabled}
              className="text-xs"
            >
              {msg}
            </Button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
        {!chatEnabled ? (
          <div className="text-center text-sm text-foreground-secondary py-2">
            Chat is disabled for this game
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Type a message..."
                disabled={disabled || !chatEnabled}
                maxLength={MAX_MESSAGE_LENGTH}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-foreground-secondary">
                {inputValue.length}/{MAX_MESSAGE_LENGTH}
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={disabled || !inputValue.trim() || !chatEnabled}
              className="px-3"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
