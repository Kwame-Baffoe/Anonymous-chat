import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import io, { Socket } from 'socket.io-client';
import MessageList from '../../components/MessageList';
import ChatInput from '../../components/ChatInput';

let socket: Socket;

interface Message {
  senderId: string;
  message: string;
  timestamp: string;
}

const ChatRoom = () => {
  const router = useRouter();
  const { id: roomId } = router.query;
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const socketInitializer = useCallback(async () => {
    await fetch('/api/socket');
    socket = io('', {
      path: '/api/socket',
    });

    socket.on('connect', () => {
      console.log('Connected to socket');
      socket.emit('joinRoom', roomId);
    });

    socket.on('receiveMessage', (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on('userJoined', ({ userId }: { userId: string }) => {
      console.log(`User ${userId} joined the room`);
    });

    socket.on('userLeft', ({ userId }: { userId: string }) => {
      console.log(`User ${userId} left the room`);
    });

    socket.on('userTyping', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prevUsers) => 
        isTyping
          ? [...prevUsers, userId]
          : prevUsers.filter((id) => id !== userId)
      );
    });

    socket.on('error', (error: string) => {
      console.error('Socket error:', error);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socket.off('connect');
      socket.off('receiveMessage');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('userTyping');
      socket.off('error');
      socket.off('connect_error');
    };
  }, [roomId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && roomId) {
      socketInitializer();
    }

    return () => {
      if (socket) {
        socket.emit('leaveRoom', roomId);
        socket.disconnect();
      }
    };
  }, [status, roomId, router, socketInitializer]);

  const sendMessage = useCallback((message: string) => {
    if (socket && roomId) {
      const timestamp = new Date().toISOString();
      socket.emit('sendMessage', { roomId, message, timestamp });
    }
  }, [roomId]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (socket && roomId) {
      socket.emit('typing', { roomId, isTyping });
    }
  }, [roomId]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      <h1 className="text-2xl font-bold p-4">Chat Room: {roomId}</h1>
      <MessageList messages={messages} currentUserId={session.user.id} />
      {typingUsers.length > 0 && (
        <div className="text-sm text-gray-500 p-2">
          {typingUsers.length === 1
            ? 'Someone is typing...'
            : `${typingUsers.length} people are typing...`}
        </div>
      )}
      <ChatInput onSendMessage={sendMessage} onTyping={handleTyping} />
    </div>
  );
};

export default ChatRoom;