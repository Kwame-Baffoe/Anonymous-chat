// pages/rooms/[id].tsx

import { useRouter } from 'next/router';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useUser } from '../../contexts/UserContext';
import axios from 'axios';
import MessageList from '../../components/MessageList';
import Header from '../../components/Header';
import Link from 'next/link';

interface Message {
  senderId: string;
  message: string;
  timestamp: string; // ISO string
}

const ChatRoom = () => {
  const router = useRouter();
  const { id: roomId } = router.query;
  const { socket } = useSocket();
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch existing messages
  useEffect(() => {
    if (!roomId) return;

    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/rooms/${roomId}/messages`);
        if (response.data.success) {
          setMessages(response.data.messages || []);
          scrollToBottom();
        } else {
          setError(response.data.error || 'Failed to fetch messages');
        }
      } catch (err) {
        setError('An error occurred while fetching messages');
      }
    };

    fetchMessages();
  }, [roomId]);

  // Initialize Socket.io events
  useEffect(() => {
    if (!socket || !roomId || !user) return;

    // Join the room
    socket.emit('joinRoom', roomId as string);

    // Listen for incoming messages
    const handleReceiveMessage = (data: Message) => {
      setMessages((prev) => [...prev, data]);
      scrollToBottom();
    };

    socket.on('receiveMessage', handleReceiveMessage);

    // Cleanup on component unmount
    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, roomId, user]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle sending messages
  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!socket) {
      setError('Socket not connected');
      return;
    }

    if (!user) {
      setError('You must be signed in to send messages');
      return;
    }

    const messageData: Message = {
      senderId: user.name || 'Anonymous',
      message: input.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      // Emit the message to the server
      socket.emit('sendMessage', {
        roomId,
        ...messageData,
      });

      // Update local state
      setMessages((prev) => [...prev, messageData]);
      setInput('');
      setError(null);
      scrollToBottom();
    } catch (err) {
      setError('Failed to send message');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <header className="flex justify-between items-center p-4 bg-blue-600 text-white shadow-md">
        <h1 className="text-2xl font-bold">Chat Room: {roomId}</h1>
        <Link href="/">
          <a className="px-4 py-2 bg-red-500 rounded-md hover:bg-red-600 transition">
            Back to Rooms
          </a>
        </Link>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-white shadow-inner">
        <form onSubmit={sendMessage} className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || !user}
            className={`ml-4 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:bg-blue-300 ${
              !user ? 'cursor-not-allowed' : ''
            }`}
          >
            Send
          </button>
        </form>
        {!user && (
          <p className="text-red-500 mt-2">
            You must be signed in to send messages.
          </p>
        )}
      </footer>
    </div>
  );
};

export default ChatRoom;
