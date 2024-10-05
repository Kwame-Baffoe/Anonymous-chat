import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  MessageSquare,
  LogOut,
  Search,
  X,
  PlusCircle,
  Send,
  Mic,
  Smile,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import debounce from 'lodash/debounce';
import io, { Socket } from 'socket.io-client';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';

interface Room {
  _id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface Message {
  _id: string;
  roomId: string;
  userId: string;
  username: string;
  content?: string;
  audioUrl?: string;
  reactions: { [key: string]: string[] };
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalRooms?: number;
    totalMessages?: number;
    hasMore: boolean;
  };
  error?: string;
}

const DashboardPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [roomPage, setRoomPage] = useState(1);
  const [roomHasMore, setRoomHasMore] = useState(true);
  const [messagePage, setMessagePage] = useState(1);
  const [messageHasMore, setMessageHasMore] = useState(true);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!session?.accessToken || !roomHasMore) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms?page=${roomPage}&limit=10`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ApiResponse<Room[]> = await response.json();
      if (data.success) {
        setRooms((prevRooms) => [...prevRooms, ...data.data]);
        setFilteredRooms((prevRooms) => [...prevRooms, ...data.data]);
        setRoomHasMore(data.pagination?.hasMore || false);
        setRoomPage((prevPage) => prevPage + 1);
      } else {
        throw new Error(data.error || 'Failed to fetch rooms');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setError('Failed to load rooms. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [session, roomPage, roomHasMore]);

  const fetchMessages = useCallback(
    async (roomId: string, page: number) => {
      try {
        const response = await fetch(
          `/api/messages?roomId=${roomId}&page=${page}&limit=20`,
          {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ApiResponse<Message[]> = await response.json();
        if (data.success) {
          setMessages((prevMessages) => [...prevMessages, ...data.data]);
          setMessageHasMore(data.pagination?.hasMore || false);
          setMessagePage((prevPage) => prevPage + 1);
        } else {
          throw new Error(data.error || 'Failed to fetch messages');
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please try again later.');
      }
    },
    [session]
  );

  const initializeSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    if (!session?.accessToken) return;

    socketRef.current = io({
      path: '/api/socket',
      auth: {
        token: session.accessToken,
      },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('newMessage', (newMessage: Message) => {
      setMessages((prevMessages) => [newMessage, ...prevMessages]);
      setRooms((prevRooms) => {
        if (!prevRooms) return prevRooms;
        return prevRooms.map((room) =>
          room._id === newMessage.roomId
            ? {
                ...room,
                lastMessage: newMessage.content || 'Voice Message',
                lastMessageAt: newMessage.createdAt,
              }
            : room
        );
      });
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop = 0;
      }
    });

    socketRef.current.on('updateReactions', (updatedMessage: Message) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        )
      );
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });
  }, [session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session) {
      fetchRooms();
      initializeSocket();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [status, session, router]);

  useEffect(() => {
    if (selectedRoom) {
      setMessages([]);
      setMessagePage(1);
      setMessageHasMore(true);
      fetchMessages(selectedRoom._id, 1);
      if (socketRef.current) {
        socketRef.current.emit('joinRoom', selectedRoom._id);
      }
    }
    return () => {
      if (selectedRoom && socketRef.current) {
        socketRef.current.emit('leaveRoom', selectedRoom._id);
      }
    };
  }, [selectedRoom, fetchMessages]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setError(null);
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ name: newRoomName }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      const data: ApiResponse<Room> = await response.json();
      if (data.success) {
        setRooms((prevRooms) => [data.data, ...prevRooms]);
        setFilteredRooms((prevRooms) => [data.data, ...prevRooms]);
        setNewRoomName('');
        setSelectedRoom(data.data);
      } else {
        throw new Error(data.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      setError(
        `Failed to create room: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !audioChunks.length) return;

    if (!socketRef.current || !socketRef.current.connected) {
      setError('Not connected to the chat server.');
      return;
    }

    try {
      let newMessage: any = {
        roomId: selectedRoom?._id,
        timestamp: new Date().toISOString(),
      };

      if (audioChunks.length) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          newMessage.audioData = reader.result;
          socketRef.current?.emit('sendMessage', newMessage);
          setAudioChunks([]);
        };
      } else {
        newMessage.content = message;
        socketRef.current.emit('sendMessage', newMessage);
      }

      setMessage('');
      setIsRecording(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setError(
        `Failed to send message: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      recorder.start();
      recorder.ondataavailable = (e) => {
        setAudioChunks((prevChunks) => [...prevChunks, e.data]);
      };
    });
  };

  const handleStopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      setError('Not connected to the chat server.');
      return;
    }
    socketRef.current.emit('reactMessage', {
      messageId,
      emoji,
      userId: session?.user.id,
    });
  };

  const handleSearch = debounce((query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredRooms(rooms);
    } else {
      const filtered = rooms.filter((room) =>
        room.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredRooms(filtered);
    }
  }, 300);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-600">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">Chat with League</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search rooms..."
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>
          <div className="flex items-center space-x-2">
            <img
              src={
                session.user?.image ||
                `https://ui-avatars.com/api/?name=${session.user?.name}&background=random`
              }
              alt={session.user?.name || 'User'}
              className="w-8 h-8 rounded-full"
            />
            <span className="text-gray-700 font-medium">{session.user?.name}</span>
          </div>
          <button
            onClick={async () => {
              const result = await Swal.fire({
                title: 'Are you sure?',
                text: 'You will be logged out of your session.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#4F46E5',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, log me out!',
                cancelButtonText: 'Cancel',
              });

              if (result.isConfirmed) {
                try {
                  await signOut({ redirect: false });
                  Swal.fire(
                    'Logged Out!',
                    'You have been successfully logged out.',
                    'success'
                  ).then(() => {
                    router.push('/login');
                  });
                } catch (error) {
                  console.error('Error signing out:', error);
                  Swal.fire('Error', 'Failed to sign out. Please try again.', 'error');
                }
              }
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition duration-300 text-sm font-medium flex items-center"
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <form onSubmit={handleCreateRoom} className="flex items-center">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Create a new room"
                className="flex-grow px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 transition duration-300 flex items-center text-sm"
              >
                <PlusCircle size={18} />
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <InfiniteScroll
              dataLength={filteredRooms.length}
              next={fetchRooms}
              hasMore={roomHasMore}
              loader={<h4>Loading...</h4>}
              height={600}
              endMessage={
                <p style={{ textAlign: 'center' }}>
                  <b>You have seen all rooms</b>
                </p>
              }
            >
              <AnimatePresence>
                {filteredRooms.map((room) => (
                  <motion.div
                    key={room._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      onClick={() => setSelectedRoom(room)}
                      className={`w-full p-3 rounded-lg transition duration-300 flex items-center ${
                        selectedRoom?._id === room._id
                          ? 'bg-indigo-100'
                          : 'bg-gray-50 hover:bg-indigo-50'
                      }`}
                    >
                      <MessageSquare className="text-indigo-600 mr-3" size={20} />
                      <div className="text-left flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800 text-sm truncate">
                          {room.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {room.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                      {room.lastMessageAt && (
                        <span className="text-xs text-gray-400 ml-2">
                          {new Date(room.lastMessageAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </InfiniteScroll>
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-gray-50">
          {selectedRoom ? (
            <>
              <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  {selectedRoom.name}
                </h2>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div
                className="flex-1 p-6 overflow-y-auto"
                id="messageContainer"
                ref={messageContainerRef}
              >
                <InfiniteScroll
                  dataLength={messages.length}
                  next={() => fetchMessages(selectedRoom._id, messagePage)}
                  hasMore={messageHasMore}
                  loader={<h4>Loading...</h4>}
                  scrollableTarget="messageContainer"
                  inverse={true}
                  style={{ display: 'flex', flexDirection: 'column-reverse' }}
                >
                  {messages.map((msg, index) => (
                    <div
                      key={msg._id}
                      className={`flex ${
                        msg.userId === session.user.id ? 'justify-end' : 'justify-start'
                      } mb-4`}
                      ref={index === messages.length - 1 ? lastMessageRef : null}
                    >
                      <div
                        className={`rounded-lg p-3 max-w-xs lg:max-w-md ${
                          msg.userId === session.user.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        {msg.userId !== session.user.id && (
                          <p className="font-semibold text-xs mb-1">{msg.username}</p>
                        )}
                        {msg.content && <p>{msg.content}</p>}
                        {msg.audioUrl && (
                          <audio controls src={msg.audioUrl} className="w-full"></audio>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="text-gray-500 hover:text-gray-700 ml-2"
                          >
                            <Smile size={16} />
                          </button>
                        </div>
                        {showEmojiPicker && (
                          <Picker
                            onSelect={(emoji: any) =>
                              handleReaction(msg._id, emoji.native)
                            }
                            style={{ position: 'absolute', zIndex: 1000 }}
                          />
                        )}
                        <div className="flex mt-2 space-x-1">
                          {Object.entries(msg.reactions || {}).map(
                            ([emoji, users]) => (
                              <div
                                key={emoji}
                                className="flex items-center text-xs bg-gray-200 rounded-full px-2 py-1"
                              >
                                <span>{emoji}</span>
                                <span className="ml-1">{users.length}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </InfiniteScroll>
              </div>
              <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex items-center">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-grow px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="ml-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition duration-300"
                    >
                      <Mic size={20} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="ml-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition duration-300"
                    >
                      <Mic size={20} />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="ml-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition duration-300"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 p-6 flex items-center justify-center">
              <p className="text-gray-500 text-center text-lg">
                Select a room to start chatting or create a new one!
              </p>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg"
            role="alert"
          >
            <p>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;
