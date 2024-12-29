import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';
import { AnimatePresence, motion } from 'framer-motion';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import Peer from 'simple-peer';
import { debounce } from 'lodash';
import {
  MessageSquare,
  User,
  LogOut,
  Phone,
  Video,
  Mic,
  Smile,
  Paperclip,
  Send,
  Edit,
  Trash2,
  Check,
  Search,
  X,
  PlusCircle,
} from 'react-feather';
import { ErrorBoundary } from 'react-error-boundary';
import { useSocket } from '../hooks/useSocket';
import { Message } from '../interfaces/Message';
import { Room } from '../interfaces/Room';
import { User as UserType } from '../interfaces/User';
import { ApiResponse } from '../types/api';
import { Attachment } from '../interfaces/Message';
import { CryptoService } from '../services/CryptoService';
import { Logger } from '../utils/Logger';
import { UserProfileModal } from '../components/UserProfileModal';
import { VoiceVideoCallModal } from '../components/VoiceVideoCallModal';
import { MessageThreadModal } from '../components/MessageThreadModal';
import { Spinner } from '../components/Spinner';

// API setup
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Custom hooks
const useRooms = () => {
  return useInfiniteQuery<ApiResponse<Room>, Error>(
    'rooms',
    async ({ pageParam = 1 }) => {
      const { data } = await api.get(`/rooms?page=${pageParam}&limit=20`);
      return {
        results: data.results || [],
        nextPage: data.nextPage || null,
      };
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    }
  );
};

const useMessages = (roomId: string) => {
  return useInfiniteQuery<ApiResponse<Message>, Error>(
    ['messages', roomId],
    async ({ pageParam = 1 }) => {
      const { data } = await api.get(
        `/messages?roomId=${roomId}&page=${pageParam}&limit=20`
      );
      return data;
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
      enabled: !!roomId,
    }
  );
};

const useOnlineUsers = () => {
  return useQuery<User[], Error>('onlineUsers', async () => {
    const { data } = await api.get('/users/online');
    return data;
  });
};

// State management with useReducer
type State = {
  selectedRoom: Room | null;
  message: string;
  isRecording: boolean;
  audioBlob: Blob | null;
  showEmojiPicker: boolean;
  attachments: File[];
  typingUsers: string[];
  editingMessageId: string | null;
  showUserProfile: boolean;
  showVoiceVideoCall: boolean;
  searchQuery: string;
  messageSearchQuery: string;
  socketConnected: boolean;
  userPresence: User['presence'];
  threadModalOpen: boolean;
  selectedThreadParentId: string | null;
  showDeleteConfirmation: boolean;
  messageToDelete: string | null;
  showEditMessage: boolean;
  editedMessageContent: string;
};

type Action =
  | { type: 'SET_SELECTED_ROOM'; payload: Room | null }
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'SET_IS_RECORDING'; payload: boolean }
  | { type: 'SET_AUDIO_BLOB'; payload: Blob | null }
  | { type: 'SET_SHOW_EMOJI_PICKER'; payload: boolean }
  | { type: 'SET_ATTACHMENTS'; payload: File[] }
  | { type: 'SET_TYPING_USERS'; payload: string[] }
  | { type: 'SET_EDITING_MESSAGE_ID'; payload: string | null }
  | { type: 'SET_SHOW_USER_PROFILE'; payload: boolean }
  | { type: 'SET_SHOW_VOICE_VIDEO_CALL'; payload: boolean }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_MESSAGE_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SOCKET_CONNECTED'; payload: boolean }
  | { type: 'SET_USER_PRESENCE'; payload: User['presence'] }
  | { type: 'SET_THREAD_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_SELECTED_THREAD_PARENT_ID'; payload: string | null }
  | { type: 'SET_SHOW_DELETE_CONFIRMATION'; payload: boolean }
  | { type: 'SET_MESSAGE_TO_DELETE'; payload: string | null }
  | { type: 'SET_SHOW_EDIT_MESSAGE'; payload: boolean }
  | { type: 'SET_EDITED_MESSAGE_CONTENT'; payload: string };

const initialState: State = {
  selectedRoom: null,
  message: '',
  isRecording: false,
  audioBlob: null,
  showEmojiPicker: false,
  attachments: [],
  typingUsers: [],
  editingMessageId: null,
  showUserProfile: false,
  showVoiceVideoCall: false,
  searchQuery: '',
  messageSearchQuery: '',
  socketConnected: false,
  userPresence: 'online',
  threadModalOpen: false,
  selectedThreadParentId: null,
  showDeleteConfirmation: false,
  messageToDelete: null,
  showEditMessage: false,
  editedMessageContent: '',
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SELECTED_ROOM':
      return { ...state, selectedRoom: action.payload };
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'SET_IS_RECORDING':
      return { ...state, isRecording: action.payload };
    case 'SET_AUDIO_BLOB':
      return { ...state, audioBlob: action.payload };
    case 'SET_SHOW_EMOJI_PICKER':
      return { ...state, showEmojiPicker: action.payload };
    case 'SET_ATTACHMENTS':
      return { ...state, attachments: action.payload };
    case 'SET_TYPING_USERS':
      return { ...state, typingUsers: action.payload };
    case 'SET_EDITING_MESSAGE_ID':
      return { ...state, editingMessageId: action.payload };
    case 'SET_SHOW_USER_PROFILE':
      return { ...state, showUserProfile: action.payload };
    case 'SET_SHOW_VOICE_VIDEO_CALL':
      return { ...state, showVoiceVideoCall: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_MESSAGE_SEARCH_QUERY':
      return { ...state, messageSearchQuery: action.payload };
    case 'SET_SOCKET_CONNECTED':
      return { ...state, socketConnected: action.payload };
    case 'SET_USER_PRESENCE':
      return { ...state, userPresence: action.payload };
    case 'SET_THREAD_MODAL_OPEN':
      return { ...state, threadModalOpen: action.payload };
    case 'SET_SELECTED_THREAD_PARENT_ID':
      return { ...state, selectedThreadParentId: action.payload };
    case 'SET_SHOW_DELETE_CONFIRMATION':
      return { ...state, showDeleteConfirmation: action.payload };
    case 'SET_MESSAGE_TO_DELETE':
      return { ...state, messageToDelete: action.payload };
    case 'SET_SHOW_EDIT_MESSAGE':
      return { ...state, showEditMessage: action.payload };
    case 'SET_EDITED_MESSAGE_CONTENT':
      return { ...state, editedMessageContent: action.payload };
    default:
      return state;
  }
}

const DashboardPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { socket, isConnected, error: socketError, reconnect } = useSocket();

  const [state, dispatch] = useReducer(reducer, initialState);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Handle socket connection errors
  useEffect(() => {
    if (socketError) {
      Swal.fire({
        title: 'Connection Error',
        text: 'Failed to connect to chat server. Would you like to retry?',
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'Retry',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          reconnect();
        }
      });
    }
  }, [socketError, reconnect]);

  const {
    data: roomsData,
    fetchNextPage: fetchNextRooms,
    hasNextPage: hasMoreRooms,
    isLoading: isLoadingRooms,
  } = useRooms();

  const {
    data: messagesData,
    fetchNextPage: fetchNextMessages,
    hasNextPage: hasMoreMessages,
    isLoading: isLoadingMessages,
  } = useMessages(state.selectedRoom?._id ?? '');

  const {
    data: onlineUsers,
    isLoading: isLoadingOnlineUsers,
  } = useOnlineUsers();

  // Redirect unauthenticated users to login page
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Socket event handlers
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
    (deletedMessageId: string) => {
      if (!state.selectedRoom) return;
      queryClient.setQueryData<ApiResponse<Message>>(
        ['messages', state.selectedRoom._id],
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
    [queryClient, state.selectedRoom]
  );

  const handleUserTyping = useCallback(
    (userData: { userId: string; username: string }) => {
      dispatch({
        type: 'SET_TYPING_USERS',
        payload: [...state.typingUsers, userData.username],
      });
    },
    [state.typingUsers]
  );

  const handleUserStoppedTyping = useCallback(
    (userData: { userId: string; username: string }) => {
      dispatch({
        type: 'SET_TYPING_USERS',
        payload: state.typingUsers.filter(
          (username) => username !== userData.username
        ),
      });
    },
    [state.typingUsers]
  );

  const handleUserPresenceChanged = useCallback(
    (userData: { userId: string; presence: User['presence'] }) => {
      queryClient.setQueryData<User[]>('onlineUsers', (oldData) => {
        if (!oldData) return [];
        return oldData.map((user) =>
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
    }: {
      messageId: string;
      emoji: string;
      userId: string;
    }) => {
      if (!state.selectedRoom) return;
      queryClient.setQueryData<ApiResponse<Message>>(
        ['messages', state.selectedRoom._id],
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
    [queryClient, state.selectedRoom]
  );

  const handleNewRoom = useCallback(
    (newRoom: Room) => {
      queryClient.setQueryData<ApiResponse<Room>>('rooms', (oldData) => {
        if (!oldData) return { results: [newRoom], nextPage: null };
        return {
          ...oldData,
          results: [newRoom, ...(oldData?.results || [])],
        };
      });
    },
    [queryClient]
  );

  const handleIncomingCall = useCallback((data: any) => {
    // Handle incoming call logic here
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    if (socket && session && state.selectedRoom) {
      // Join the selected room
      socket.emit('joinRoom', state.selectedRoom._id);

      // Register event listeners
      socket.on('newMessage', handleNewMessage);
      socket.on('messageEdited', handleMessageUpdated);
      socket.on('messageDeleted', handleMessageDeleted);
      socket.on('userTyping', handleUserTyping);
      socket.on('userStoppedTyping', handleUserStoppedTyping);
      socket.on('userPresenceChanged', handleUserPresenceChanged);
      socket.on('messageReaction', handleMessageReaction);
      socket.on('incomingCall', handleIncomingCall);
      socket.on('newRoom', handleNewRoom);

      // Cleanup event listeners on unmount or when dependencies change
      return () => {
        socket.emit('leaveRoom', state.selectedRoom?._id);
        socket.off('newMessage', handleNewMessage);
        socket.off('messageEdited', handleMessageUpdated);
        socket.off('messageDeleted', handleMessageDeleted);
        socket.off('userTyping', handleUserTyping);
        socket.off('userStoppedTyping', handleUserStoppedTyping);
        socket.off('userPresenceChanged', handleUserPresenceChanged);
        socket.off('messageReaction', handleMessageReaction);
        socket.off('incomingCall', handleIncomingCall);
        socket.off('newRoom', handleNewRoom);
      };
    }
  }, [
    socket,
    session,
    state.selectedRoom,
    handleNewMessage,
    handleMessageUpdated,
    handleMessageDeleted,
    handleUserTyping,
    handleUserStoppedTyping,
    handleUserPresenceChanged,
    handleMessageReaction,
    handleIncomingCall,
    handleNewRoom,
  ]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!state.message.trim() &&
        !state.audioBlob &&
        state.attachments.length === 0) ||
      !state.selectedRoom ||
      !session
    )
      return;

    const optimisticMessage: Message = {
      _id: uuidv4(),
      roomId: state.selectedRoom._id,
      userId: session.user.id,
      username: session.user.name || '',
      content: state.message,
      createdAt: new Date().toISOString(),
      reactions: {},
    };

    // Optimistically update UI
    queryClient.setQueryData<ApiResponse<Message>>(
      ['messages', state.selectedRoom._id],
      (oldData) => {
        if (!oldData) return { results: [optimisticMessage], nextPage: null };
        return {
          ...oldData,
          results: [optimisticMessage, ...(oldData?.results || [])],
        };
      }
    );

    try {
      let messageContent = state.message;
      const attachmentsList: Omit<Attachment, '_id'>[] = [];

      if (state.audioBlob) {
        const audioUrl = await uploadAudio(state.audioBlob);
        messageContent = `[Audio Message](${audioUrl})`;
      }

      if (state.attachments.length > 0) {
        const uploadPromises = state.attachments.map(async (file) => {
          const attachmentUrl = await uploadAttachment(file);
          return {
            filename: file.name,
            url: attachmentUrl,
            contentType: file.type,
          };
        });
        attachmentsList.push(...await Promise.all(uploadPromises));
      }

      // Encryption
      const encryptedContent = CryptoService.encrypt(
        messageContent,
        state.selectedRoom.publicKey,
        session.user.privateKey
      );

      // Send message via socket
      socket?.emit('sendMessage', {
        roomId: state.selectedRoom._id,
        content: encryptedContent,
        attachments: attachmentsList,
      });

      // Clear input fields
      dispatch({ type: 'SET_MESSAGE', payload: '' });
      dispatch({ type: 'SET_AUDIO_BLOB', payload: null });
      dispatch({ type: 'SET_ATTACHMENTS', payload: [] });
    } catch (error) {
      Logger.error('Error sending message:', error);
      // Remove optimistic message
      queryClient.setQueryData<ApiResponse<Message>>(
        ['messages', state.selectedRoom._id],
        (oldData) => {
          if (!oldData) return { results: [], nextPage: null };
          return {
            ...oldData,
            results: oldData.results.filter(
              (msg) => msg._id !== optimisticMessage._id
            ),
          };
        }
      );
      Swal.fire('Error', 'Failed to send message. Please try again.', 'error');
    }
  };

  // Debounced typing handler
  const handleTyping = useCallback(
    debounce(() => {
      if (state.selectedRoom && socket) {
        socket.emit('userTyping', { roomId: state.selectedRoom._id });
      }
    }, 300),
    [state.selectedRoom, socket]
  );

  const handleStopTyping = useCallback(
    debounce(() => {
      if (state.selectedRoom && socket) {
        socket.emit('userStoppedTyping', { roomId: state.selectedRoom._id });
      }
    }, 1000),
    [state.selectedRoom, socket]
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: BlobPart[] = [];
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        dispatch({ type: 'SET_AUDIO_BLOB', payload: audioBlob });
      });

      mediaRecorder.start();
      dispatch({ type: 'SET_IS_RECORDING', payload: true });
    } catch (error) {
      Logger.error('Error starting recording:', error);
      Swal.fire(
        'Error',
        'Failed to start recording. Please check your microphone permissions.',
        'error'
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      dispatch({ type: 'SET_IS_RECORDING', payload: false });
    }
  }, []);

  const uploadAudio = useCallback(async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', blob, 'audio.webm');
    try {
      const { data } = await api.post<{ url: string }>('/upload-audio', formData);
      return data.url;
    } catch (error) {
      Logger.error('Error uploading audio:', error);
      throw new Error('Failed to upload audio');
    }
  }, []);

  const uploadAttachment = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post<{ url: string }>(
        '/upload-attachment',
        formData
      );
      return data.url;
    } catch (error) {
      Logger.error('Error uploading attachment:', error);
      throw new Error('Failed to upload attachment');
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'You will be logged out of your session.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, log out!',
      });

      if (result.isConfirmed) {
        await signOut({ redirect: false });
        Swal.fire(
          'Logged Out!',
          'You have been successfully logged out.',
          'success'
        ).then(() => {
          router.push('/login');
        });
      }
    } catch (error) {
      Logger.error('Error signing out:', error);
      Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
    }
  }, [router]);

  const handleUserProfileClick = useCallback(() => {
    dispatch({ type: 'SET_SHOW_USER_PROFILE', payload: true });
  }, []);

  const handleVoiceCallClick = useCallback(() => {
    initiateCall('audio');
  }, []);

  const handleVideoCallClick = useCallback(() => {
    initiateCall('video');
  }, []);

  const initiateCall = useCallback(
    (type: 'audio' | 'video') => {
      if (!state.selectedRoom) return;

      navigator.mediaDevices
        .getUserMedia({ audio: true, video: type === 'video' })
        .then((stream) => {
          peerRef.current = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
          });

          peerRef.current.on('signal', (data) => {
            // Send signal data via socket
            socket?.emit('initiateCall', {
              roomId: state.selectedRoom?._id,
              type,
              signalData: data,
            });
          });

          peerRef.current.on('stream', (remoteStream: MediaStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          });

          // Handle call accepted and signal received
          socket?.on('callAccepted', (signal: any) => {
            peerRef.current?.signal(signal);
          });

          dispatch({ type: 'SET_SHOW_VOICE_VIDEO_CALL', payload: true });
        })
        .catch((err) => {
          Logger.error('Failed to get local stream', err);
          Swal.fire('Error', 'Failed to access camera/microphone', 'error');
        });
    },
    [state.selectedRoom, socket]
  );

  const acceptCall = useCallback(
    (data: { from: string; type: 'audio' | 'video'; signal: any }) => {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: data.type === 'video' })
        .then((stream) => {
          peerRef.current = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
          });

          peerRef.current.on('signal', (signal) => {
            // Send signal back to caller via socket
            socket?.emit('acceptCall', { to: data.from, signalData: signal });
          });

          peerRef.current.on('stream', (remoteStream: MediaStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          });

          peerRef.current.signal(data.signal);

          dispatch({ type: 'SET_SHOW_VOICE_VIDEO_CALL', payload: true });
        })
        .catch((err) => {
          Logger.error('Failed to get local stream', err);
          Swal.fire('Error', 'Failed to access camera/microphone', 'error');
        });
    },
    [socket]
  );

  const declineCall = useCallback((callId: string) => {
    socket?.emit('declineCall', { callId });
  }, [socket]);

  const endCall = useCallback(() => {
    peerRef.current?.destroy();
    dispatch({ type: 'SET_SHOW_VOICE_VIDEO_CALL', payload: false });
  }, []);

  const handleUserPresenceChange = useCallback(
    (presence: User['presence']) => {
      dispatch({ type: 'SET_USER_PRESENCE', payload: presence });
      socket?.emit('updatePresence', { presence });
    },
    [socket]
  );

  const handleMessageThread = useCallback((parentMessageId: string) => {
    dispatch({ type: 'SET_SELECTED_THREAD_PARENT_ID', payload: parentMessageId });
    dispatch({ type: 'SET_THREAD_MODAL_OPEN', payload: true });
  }, []);

  const handleSearchMessages = useCallback(
    debounce((query: string) => {
      dispatch({ type: 'SET_MESSAGE_SEARCH_QUERY', payload: query });
      // Implement message search logic here if needed
    }, 300),
    []
  );

  const addReplyToThread = useCallback(
    (parentId: string, content: string) => {
      if (!session || !state.selectedRoom) return;

      const encryptedContent = CryptoService.encrypt(
        content,
        state.selectedRoom.publicKey,
        session.user.privateKey
      );

      // Send thread message via socket
      socket?.emit('addMessageToThread', {
        parentId,
        content: encryptedContent,
        roomId: state.selectedRoom._id,
      });
    },
    [session, state.selectedRoom, socket]
  );

  const handleEditClick = useCallback((messageId: string, content: string) => {
    dispatch({ type: 'SET_EDITING_MESSAGE_ID', payload: messageId });
    dispatch({ type: 'SET_EDITED_MESSAGE_CONTENT', payload: content });
    dispatch({ type: 'SET_SHOW_EDIT_MESSAGE', payload: true });
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (!state.editingMessageId || !state.selectedRoom || !session) return;
    try {
      const encryptedContent = CryptoService.encrypt(
        state.editedMessageContent,
        state.selectedRoom.publicKey,
        session.user.privateKey
      );

      // Send edit message via socket
      socket?.emit('editMessage', {
        messageId: state.editingMessageId,
        content: encryptedContent,
      });

      dispatch({ type: 'SET_SHOW_EDIT_MESSAGE', payload: false });
      dispatch({ type: 'SET_EDITING_MESSAGE_ID', payload: null });
      dispatch({ type: 'SET_EDITED_MESSAGE_CONTENT', payload: '' });
    } catch (error) {
      Logger.error('Error editing message:', error);
      Swal.fire('Error', 'Failed to edit message', 'error');
    }
  }, [
    state.editingMessageId,
    state.selectedRoom,
    session,
    state.editedMessageContent,
    socket,
  ]);

  const handleDeleteClick = useCallback((messageId: string) => {
    dispatch({ type: 'SET_MESSAGE_TO_DELETE', payload: messageId });
    dispatch({ type: 'SET_SHOW_DELETE_CONFIRMATION', payload: true });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!state.messageToDelete || !state.selectedRoom || !socket) return;
    try {
      // Send delete message via socket
      socket.emit('deleteMessage', {
        messageId: state.messageToDelete,
        roomId: state.selectedRoom._id,
      });
      dispatch({ type: 'SET_SHOW_DELETE_CONFIRMATION', payload: false });
      dispatch({ type: 'SET_MESSAGE_TO_DELETE', payload: null });
    } catch (error) {
      Logger.error('Error deleting message:', error);
      Swal.fire('Error', 'Failed to delete message', 'error');
    }
  }, [state.messageToDelete, state.selectedRoom, socket]);

  const handleMessageReactionClick = useCallback(
    (messageId: string, emoji: string) => {
      if (!session || !state.selectedRoom) return;
      socket?.emit('messageReaction', {
        messageId,
        emoji,
        userId: session.user.id,
        roomId: state.selectedRoom._id,
      });
    },
    [session, state.selectedRoom, socket]
  );

  const renderMessage = useCallback(
    (msg: Message) => {
      const myPrivateKey = session?.user.privateKey || '';
      let decryptedContent = '';
      try {
        decryptedContent = CryptoService.decrypt(
          msg.content,
          state.selectedRoom?.publicKey || '',
          myPrivateKey
        );
      } catch (error) {
        Logger.error('Decryption error:', error);
        decryptedContent = '[Unable to decrypt message]';
      }

      return (
        <motion.div
          key={msg._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`mb-4 ${
            msg.userId === session?.user.id ? 'text-right' : 'text-left'
          }`}
          aria-label={`Message from ${msg.username}`}
        >
          <div
            className={`inline-block p-3 rounded-lg ${
              msg.userId === session?.user.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            <p className="font-medium">{msg.username}</p>
            <p>{decryptedContent}</p>
            {msg.attachments &&
              msg.attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-sm underline"
                  aria-label={`Attachment: ${attachment.filename}`}
                >
                  <Paperclip size={14} className="inline mr-1" aria-hidden="true" />
                  {attachment.filename}
                </a>
              ))}
            <p className="text-xs mt-1 opacity-70">
              {new Date(msg.createdAt).toLocaleTimeString()}
              {msg.isEdited && ' (edited)'}
            </p>
            <div className="mt-2 flex justify-end space-x-2">
              {Object.entries(msg.reactions).map(([emoji, users]) => (
                <span key={emoji} className="text-sm bg-gray-300 rounded-full px-2 py-1">
                  {emoji} {users.length}
                </span>
              ))}
              <button
                onClick={() =>
                  handleMessageReactionClick(msg._id, '👍')
                }
                className="text-sm"
                aria-label="React with thumbs up"
              >
                👍
              </button>
              <button
                onClick={() =>
                  handleMessageReactionClick(msg._id, '❤️')
                }
                className="text-sm"
                aria-label="React with heart"
              >
                ❤️
              </button>
              <button
                onClick={() =>
                  handleMessageReactionClick(msg._id, '😂')
                }
                className="text-sm"
                aria-label="React with laughing face"
              >
                😂
              </button>
            </div>
            {msg.userId === session?.user.id && (
              <div className="mt-1 space-x-2">
                <button
                  onClick={() =>
                    handleEditClick(
                      msg._id,
                      CryptoService.decrypt(
                        msg.content,
                        state.selectedRoom?.publicKey || '',
                        myPrivateKey
                      )
                    )
                  }
                  className="text-xs text-blue-500 hover:underline"
                  aria-label="Edit message"
                >
                  <Edit size={14} className="inline mr-1" aria-hidden="true" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(msg._id)}
                  className="text-xs text-red-500 hover:underline"
                  aria-label="Delete message"
                >
                  <Trash2 size={14} className="inline mr-1" aria-hidden="true" />
                  Delete
                </button>
              </div>
            )}
            <button
              onClick={() => handleMessageThread(msg._id)}
              className="text-xs text-gray-500 hover:underline mt-1"
              aria-label={
                msg.thread && msg.thread.length > 0
                  ? `View Thread (${msg.thread.length} replies)`
                  : 'Reply in Thread'
              }
            >
              <MessageSquare size={14} className="inline mr-1" aria-hidden="true" />
              {msg.thread && msg.thread.length > 0
                ? `View Thread (${msg.thread.length})`
                : 'Reply in Thread'}
            </button>
          </div>
        </motion.div>
      );
    },
    [
      session,
      handleMessageReactionClick,
      handleMessageThread,
      handleEditClick,
      handleDeleteClick,
      state.selectedRoom,
    ]
  );

  const createRoom = async (roomName: string) => {
    try {
      const { data } = await api.post<Room>('/rooms', { name: roomName });
      queryClient.setQueryData(['rooms'], (oldData: any) => {
        if (!oldData) return { pages: [{ results: [data], nextPage: null }] };
        return {
          ...oldData,
          pages: [
            { 
              ...oldData.pages[0],
              results: [data, ...(oldData.pages[0]?.results || [])]
            },
            ...oldData.pages.slice(1)
          ]
        };
      });
      Swal.fire('Success', 'Room created successfully', 'success');
    } catch (error: any) {
      Logger.error('Error creating room:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create room';
      Swal.fire('Error', errorMessage, 'error');
    }
  };

  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div
          className="flex flex-col items-center justify-center h-screen"
          role="alert"
        >
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-300"
          >
            Try again
          </button>
        </div>
      )}
    >
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Chat Application</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleUserProfileClick}
              className="text-indigo-600 hover:text-indigo-800 flex items-center"
              aria-label="View profile"
            >
              <User size={20} className="mr-2" aria-hidden="true" />
              Profile
            </button>
            <select
              value={state.userPresence}
              onChange={(e) =>
                handleUserPresenceChange(e.target.value as User['presence'])
              }
              className="bg-gray-100 border border-gray-300 rounded-md px-2 py-1"
              aria-label="Set user presence"
            >
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
              <option value="offline">Appear Offline</option>
            </select>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 flex items-center"
              aria-label="Logout"
            >
              <LogOut size={20} className="mr-2" aria-hidden="true" />
              Logout
            </button>
            <div
              className={`w-3 h-3 rounded-full ${
                socket?.connected ? 'bg-green-500' : 'bg-red-500'
              }`}
              aria-label={socket?.connected ? 'Connected' : 'Disconnected'}
            ></div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside
            className="w-64 bg-white border-r border-gray-200 flex flex-col"
            aria-label="Chat rooms"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search rooms by name or last message..."
                  value={state.searchQuery}
                  onChange={(e) =>
                    dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })
                  }
                  className="w-full px-4 py-3 pl-12 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  aria-label="Search rooms"
                />
                <Search
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                  aria-hidden="true"
                />
                {state.searchQuery && (
                  <button
                    onClick={() => dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoadingRooms ? (
                <Spinner />
              ) : (
                roomsData?.pages.map((page, i) => (
                  <React.Fragment key={i}>
                    {(page.results || [])
                      .filter((room) => {
                        const searchQuery = state.searchQuery.toLowerCase();
                        return (
                          (room?.name && room.name.toLowerCase().includes(searchQuery)) ||
                          (room?.lastMessage && room.lastMessage.toLowerCase().includes(searchQuery))
                        );
                      })
                      .map((room: Room) => (
                        <div
                          key={room._id}
                          className={`p-4 hover:bg-gray-100 cursor-pointer transition-colors duration-200 ${
                            state.selectedRoom?._id === room._id
                              ? 'bg-indigo-100'
                              : ''
                          } ${
                            state.searchQuery && 
                            ((room?.name && room.name.toLowerCase().includes(state.searchQuery.toLowerCase())) ||
                            (room?.lastMessage && room.lastMessage.toLowerCase().includes(state.searchQuery.toLowerCase())))
                              ? 'ring-2 ring-indigo-300'
                              : ''
                          }`}
                          onClick={() =>
                            dispatch({ type: 'SET_SELECTED_ROOM', payload: room })
                          }
                          role="button"
                          aria-pressed={state.selectedRoom?._id === room._id}
                          tabIndex={0}
                        >
                          <div className="flex items-center">
                            <MessageSquare
                              size={20}
                              className="mr-2 text-indigo-600"
                              aria-hidden="true"
                            />
                            <span className="font-medium">{room.name}</span>
                          </div>
                          {room.lastMessage && (
                            <p className="text-sm text-gray-500 truncate mt-1">
                              {room.lastMessage}
                            </p>
                          )}
                        </div>
                      ))}
                  </React.Fragment>
                ))
              )}
              {hasMoreRooms && !isLoadingRooms && (
                <button
                  onClick={() => fetchNextRooms()}
                  className="w-full p-3 text-center text-indigo-600 hover:bg-gray-100"
                >
                  Load More Rooms
                </button>
              )}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  Swal.fire({
                    title: 'Create New Room',
                    input: 'text',
                    inputLabel: 'Room Name',
                    showCancelButton: true,
                    inputValidator: (value) => {
                      if (!value) {
                        return 'You need to write something!';
                      }
                      return null;
                    },
                  }).then((result) => {
                    if (result.isConfirmed && result.value) {
                      createRoom(result.value);
                    }
                  });
                }}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-300 flex items-center justify-center"
                aria-label="Create new room"
              >
                <PlusCircle size={20} className="mr-2" aria-hidden="true" />
                Create New Room
              </button>
            </div>
          </aside>

          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col" aria-label="Chat messages">
            {state.selectedRoom ? (
              <>
                {/* Chat Header */}
                <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    {state.selectedRoom.name}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={state.messageSearchQuery}
                      onChange={(e) => handleSearchMessages(e.target.value)}
                      className="px-2 py-1 border rounded-md text-sm"
                      aria-label="Search messages"
                    />
                    <button
                      onClick={handleVoiceCallClick}
                      className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                      aria-label="Start voice call"
                    >
                      <Phone size={20} aria-hidden="true" />
                    </button>
                    <button
                      onClick={handleVideoCallClick}
                      className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                      aria-label="Start video call"
                    >
                      <Video size={20} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4" ref={lastMessageRef}>
                  {isLoadingMessages ? (
                    <Spinner />
                  ) : (
                    <AnimatePresence>
                      {messagesData?.pages.map((page, pageIndex) => (
                        <React.Fragment key={`page-${pageIndex}`}>
                          {page.results
                            .filter((msg: Message) => {
                              const myPrivateKey = session?.user.privateKey || '';
                              let decryptedContent = '';
                              try {
                                decryptedContent = CryptoService.decrypt(
                                  msg.content,
                                  state.selectedRoom?.publicKey || '',
                                  myPrivateKey
                                );
                              } catch (error) {
                                Logger.error('Decryption error:', error);
                                decryptedContent = '[Unable to decrypt message]';
                              }
                              return decryptedContent
                                .toLowerCase()
                                .includes(
                                  state.messageSearchQuery.toLowerCase()
                                );
                            })
                            .map((msg: Message) => renderMessage(msg))}
                        </React.Fragment>
                      ))}
                    </AnimatePresence>
                  )}
                  {hasMoreMessages && !isLoadingMessages && (
                    <button
                      onClick={() => fetchNextMessages()}
                      className="w-full p-3 text-center text-indigo-600 hover:bg-gray-100"
                    >
                      Load More Messages
                    </button>
                  )}
                </div>

                {/* Message Input */}
                <div className="bg-white p-4 border-t border-gray-200">
                  {state.typingUsers.length > 0 && (
                    <div
                      className="text-sm text-gray-500 italic mb-2"
                      aria-live="polite"
                    >
                      {state.typingUsers.join(', ')}{' '}
                      {state.typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </div>
                  )}
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="text"
                      value={state.message}
                      onChange={(e) => {
                        dispatch({ type: 'SET_MESSAGE', payload: e.target.value });
                        handleTyping();
                      }}
                      onBlur={handleStopTyping}
                      placeholder="Type your message..."
                      className="flex-grow px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Message input"
                    />
                    <button
                      type="button"
                      onClick={state.isRecording ? stopRecording : startRecording}
                      className={`p-2 rounded-full ${
                        state.isRecording
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      } hover:opacity-80`}
                      aria-label={
                        state.isRecording ? 'Stop recording' : 'Start recording'
                      }
                    >
                      <Mic size={20} aria-hidden="true" />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: 'SET_SHOW_EMOJI_PICKER',
                            payload: !state.showEmojiPicker,
                          })
                        }
                        className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
                        aria-label="Open emoji picker"
                      >
                        <Smile size={20} aria-hidden="true" />
                      </button>
                      {state.showEmojiPicker && (
                        <div className="absolute bottom-full right-0 mb-2">
                          <EmojiPicker
                            onEmojiClick={(emojiObject: EmojiClickData) => {
                              dispatch({
                                type: 'SET_MESSAGE',
                                payload: state.message + emojiObject.emoji,
                              });
                              dispatch({
                                type: 'SET_SHOW_EMOJI_PICKER',
                                payload: false,
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <label className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 cursor-pointer">
                      <Paperclip size={20} aria-hidden="true" />
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) {
                            dispatch({
                              type: 'SET_ATTACHMENTS',
                              payload: [
                                ...state.attachments,
                                ...Array.from(files),
                              ],
                            });
                          }
                        }}
                        className="hidden"
                        aria-label="Attach files"
                      />
                    </label>
                    <button
                      type="submit"
                      className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
                      aria-label="Send message"
                    >
                      <Send size={20} aria-hidden="true" />
                    </button>
                  </form>
                  {state.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2" aria-label="Attached files">
                      {state.attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center bg-gray-100 rounded p-1"
                        >
                          <span className="text-sm truncate max-w-xs">
                            {file.name}
                          </span>
                          <button
                            onClick={() =>
                              dispatch({
                                type: 'SET_ATTACHMENTS',
                                payload: state.attachments.filter(
                                  (_, i) => i !== index
                                ),
                              })
                            }
                            className="ml-2 text-red-500 hover:text-red-700"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-xl">
                  Select a room to start chatting
                </p>
              </div>
            )}
          </main>

          {/* Online Users Sidebar */}
          <aside
            className="w-64 bg-white border-l border-gray-200 p-4"
            aria-label="Online users"
          >
            <h3 className="font-semibold mb-4">Online Users</h3>
            <div className="space-y-2">
              {isLoadingOnlineUsers ? (
                <Spinner />
              ) : (
                onlineUsers?.map((user: User) => (
                  <div key={user._id} className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${
                        user.presence === 'online'
                          ? 'bg-green-500'
                          : user.presence === 'away'
                          ? 'bg-yellow-500'
                          : user.presence === 'busy'
                          ? 'bg-red-500'
                          : 'bg-gray-500'
                      }`}
                      aria-hidden="true"
                    ></div>
                    <span>{user.username}</span>
                    <span className="sr-only">{user.presence}</span>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* User Profile Modal */}
      {state.showUserProfile && (
        <UserProfileModal
          user={session!.user}
          onClose={() => dispatch({ type: 'SET_SHOW_USER_PROFILE', payload: false })}
          onUpdate={async (updatedUser) => {
            try {
              const { data } = await api.put('/users/profile', updatedUser);
              queryClient.setQueryData(['user', session!.user.id], data);
              Swal.fire('Success', 'Profile updated successfully', 'success');
            } catch (error) {
              Logger.error('Error updating profile:', error);
              Swal.fire('Error', 'Failed to update profile', 'error');
            }
          }}
        />
      )}

      {/* Voice/Video Call Modal */}
      {state.showVoiceVideoCall && (
        <VoiceVideoCallModal
          roomId={state.selectedRoom?._id ?? ''}
          onClose={() => {
            endCall();
            dispatch({ type: 'SET_SHOW_VOICE_VIDEO_CALL', payload: false });
          }}
        >
          <video ref={remoteVideoRef} autoPlay playsInline />
          <button
            onClick={endCall}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition duration-300"
            aria-label="End call"
          >
            End Call
          </button>
        </VoiceVideoCallModal>
      )}

      {/* Message Thread Modal */}
      {state.threadModalOpen && state.selectedThreadParentId && (
        <MessageThreadModal
          parentMessageId={state.selectedThreadParentId}
          onClose={() => dispatch({ type: 'SET_THREAD_MODAL_OPEN', payload: false })}
          onAddReply={addReplyToThread}
        />
      )}

      {/* Edit Message Modal */}
      {state.showEditMessage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-labelledby="edit-message-title"
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 id="edit-message-title" className="text-lg font-semibold mb-4">
              Edit Message
            </h3>
            <textarea
              value={state.editedMessageContent}
              onChange={(e) =>
                dispatch({ type: 'SET_EDITED_MESSAGE_CONTENT', payload: e.target.value })
              }
              className="w-full p-2 border rounded-md mb-4"
              rows={4}
              aria-label="Edit message content"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => dispatch({ type: 'SET_SHOW_EDIT_MESSAGE', payload: false })}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-300"
              >
                <Check size={20} className="mr-2 inline" aria-hidden="true" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {state.showDeleteConfirmation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-labelledby="delete-confirmation-title"
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 id="delete-confirmation-title" className="text-lg font-semibold mb-4">
              Confirm Deletion
            </h3>
            <p>Are you sure you want to delete this message?</p>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() =>
                  dispatch({ type: 'SET_SHOW_DELETE_CONFIRMATION', payload: false })
                }
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition duration-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition duration-300"
              >
                <Trash2 size={20} className="mr-2 inline" aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
};

export default DashboardPage;
