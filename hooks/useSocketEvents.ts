import { useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { Message } from '../interfaces/Message';
import { Room } from '../interfaces/Room';
import { User } from '../interfaces/User';
import { ApiResponse } from '../types/api';

interface UseSocketEventsProps {
  socket: Socket | null;
  selectedRoomId: string | null;
  onTypingUsers: (users: string[]) => void;
}

export const useSocketEvents = ({
  socket,
  selectedRoomId,
  onTypingUsers,
}: UseSocketEventsProps) => {
  const queryClient = useQueryClient();

  const handleNewMessage = useCallback(
    (newMessage: Message) => {
      queryClient.setQueryData<ApiResponse<Message>>(
        ['messages', newMessage.roomId],
        (oldData) => {
          if (!oldData) return { results: [newMessage], nextPage: null };
          return {
            ...oldData,
            results: [newMessage, ...(oldData?.results || [])],
          };
        }
      );
    },
    [queryClient]
  );

  const handleMessageUpdated = useCallback(
    (updatedMessage: Message) => {
      queryClient.setQueryData<ApiResponse<Message>>(
        ['messages', updatedMessage.roomId],
        (oldData) => {
          if (!oldData) return { results: [updatedMessage], nextPage: null };
          return {
            ...oldData,
            results: oldData.results.map((msg) =>
              msg._id === updatedMessage._id ? updatedMessage : msg
            ),
          };
        }
      );
    },
    [queryClient]
  );

  const handleMessageDeleted = useCallback(
    (deletedMessageId: string, roomId: string) => {
      queryClient.setQueryData<ApiResponse<Message>>(
        ['messages', roomId],
        (oldData) => {
          if (!oldData) return { results: [], nextPage: null };
          return {
            ...oldData,
            results: oldData.results.filter(
              (msg) => msg._id !== deletedMessageId
            ),
          };
        }
      );
    },
    [queryClient]
  );

  const handleUserTyping = useCallback(
    (userData: { userId: string; username: string }, currentTypingUsers: string[]) => {
      onTypingUsers([...currentTypingUsers, userData.username]);
    },
    [onTypingUsers]
  );

  const handleUserStoppedTyping = useCallback(
    (userData: { userId: string; username: string }, currentTypingUsers: string[]) => {
      onTypingUsers(
        currentTypingUsers.filter((username) => username !== userData.username)
      );
    },
    [onTypingUsers]
  );

  const handleUserPresenceChanged = useCallback(
    (userData: { userId: string; presence: User['presence'] }) => {
      queryClient.setQueryData<User[]>(['onlineUsers'], (oldData) => {
        if (!oldData) return [];
        return oldData.map((user: User) =>
          user._id === userData.userId
            ? { ...user, presence: userData.presence }
            : user
        );
      });
    },
    [queryClient]
  );

  const handleMessageReaction = useCallback(
    ({
      messageId,
      emoji,
      userId,
      roomId,
    }: {
      messageId: string;
      emoji: string;
      userId: string;
      roomId: string;
    }) => {
      queryClient.setQueryData<ApiResponse<Message>>(
        ['messages', roomId],
        (oldData) => {
          if (!oldData) return { results: [], nextPage: null };
          return {
            ...oldData,
            results: oldData.results.map((msg) =>
              msg._id === messageId
                ? {
                    ...msg,
                    reactions: {
                      ...msg.reactions,
                      [emoji]: [...(msg.reactions[emoji] || []), userId],
                    },
                  }
                : msg
            ),
          };
        }
      );
    },
    [queryClient]
  );

  const handleNewRoom = useCallback(
    (newRoom: Room) => {
      queryClient.setQueryData(['rooms'], (oldData: any) => {
        if (!oldData) return { pages: [{ results: [newRoom], nextPage: null }] };
        return {
          ...oldData,
          pages: [
            { 
              ...oldData.pages[0],
              results: [newRoom, ...(oldData.pages[0]?.results || [])]
            },
            ...oldData.pages.slice(1)
          ]
        };
      });
    },
    [queryClient]
  );

  useEffect(() => {
    if (socket && selectedRoomId) {
      // Join the selected room
      socket.emit('joinRoom', selectedRoomId);

      // Register event listeners
      socket.on('newMessage', handleNewMessage);
      socket.on('messageEdited', handleMessageUpdated);
      socket.on('messageDeleted', handleMessageDeleted);
      socket.on('userTyping', handleUserTyping);
      socket.on('userStoppedTyping', handleUserStoppedTyping);
      socket.on('userPresenceChanged', handleUserPresenceChanged);
      socket.on('messageReaction', handleMessageReaction);
      socket.on('newRoom', handleNewRoom);

      // Cleanup event listeners on unmount or when dependencies change
      return () => {
        socket.emit('leaveRoom', selectedRoomId);
        socket.off('newMessage', handleNewMessage);
        socket.off('messageEdited', handleMessageUpdated);
        socket.off('messageDeleted', handleMessageDeleted);
        socket.off('userTyping', handleUserTyping);
        socket.off('userStoppedTyping', handleUserStoppedTyping);
        socket.off('userPresenceChanged', handleUserPresenceChanged);
        socket.off('messageReaction', handleMessageReaction);
        socket.off('newRoom', handleNewRoom);
      };
    }
  }, [
    socket,
    selectedRoomId,
    handleNewMessage,
    handleMessageUpdated,
    handleMessageDeleted,
    handleUserTyping,
    handleUserStoppedTyping,
    handleUserPresenceChanged,
    handleMessageReaction,
    handleNewRoom,
  ]);

  return {
    handleNewMessage,
    handleMessageUpdated,
    handleMessageDeleted,
    handleUserTyping,
    handleUserStoppedTyping,
    handleUserPresenceChanged,
    handleMessageReaction,
    handleNewRoom,
  };
};
