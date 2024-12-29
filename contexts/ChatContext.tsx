import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Room } from '../interfaces/Room';
import { User } from '../interfaces/User';

interface State {
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
}

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

interface ChatContextType {
  state: State;
  dispatch: React.Dispatch<Action>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

// Export action creators for better type safety and reusability
export const chatActions = {
  setSelectedRoom: (room: Room | null): Action => ({
    type: 'SET_SELECTED_ROOM',
    payload: room,
  }),
  setMessage: (message: string): Action => ({
    type: 'SET_MESSAGE',
    payload: message,
  }),
  setIsRecording: (isRecording: boolean): Action => ({
    type: 'SET_IS_RECORDING',
    payload: isRecording,
  }),
  setAudioBlob: (blob: Blob | null): Action => ({
    type: 'SET_AUDIO_BLOB',
    payload: blob,
  }),
  setShowEmojiPicker: (show: boolean): Action => ({
    type: 'SET_SHOW_EMOJI_PICKER',
    payload: show,
  }),
  setAttachments: (files: File[]): Action => ({
    type: 'SET_ATTACHMENTS',
    payload: files,
  }),
  setTypingUsers: (users: string[]): Action => ({
    type: 'SET_TYPING_USERS',
    payload: users,
  }),
  setEditingMessageId: (id: string | null): Action => ({
    type: 'SET_EDITING_MESSAGE_ID',
    payload: id,
  }),
  setShowUserProfile: (show: boolean): Action => ({
    type: 'SET_SHOW_USER_PROFILE',
    payload: show,
  }),
  setShowVoiceVideoCall: (show: boolean): Action => ({
    type: 'SET_SHOW_VOICE_VIDEO_CALL',
    payload: show,
  }),
  setSearchQuery: (query: string): Action => ({
    type: 'SET_SEARCH_QUERY',
    payload: query,
  }),
  setMessageSearchQuery: (query: string): Action => ({
    type: 'SET_MESSAGE_SEARCH_QUERY',
    payload: query,
  }),
  setSocketConnected: (connected: boolean): Action => ({
    type: 'SET_SOCKET_CONNECTED',
    payload: connected,
  }),
  setUserPresence: (presence: User['presence']): Action => ({
    type: 'SET_USER_PRESENCE',
    payload: presence,
  }),
  setThreadModalOpen: (open: boolean): Action => ({
    type: 'SET_THREAD_MODAL_OPEN',
    payload: open,
  }),
  setSelectedThreadParentId: (id: string | null): Action => ({
    type: 'SET_SELECTED_THREAD_PARENT_ID',
    payload: id,
  }),
  setShowDeleteConfirmation: (show: boolean): Action => ({
    type: 'SET_SHOW_DELETE_CONFIRMATION',
    payload: show,
  }),
  setMessageToDelete: (id: string | null): Action => ({
    type: 'SET_MESSAGE_TO_DELETE',
    payload: id,
  }),
  setShowEditMessage: (show: boolean): Action => ({
    type: 'SET_SHOW_EDIT_MESSAGE',
    payload: show,
  }),
  setEditedMessageContent: (content: string): Action => ({
    type: 'SET_EDITED_MESSAGE_CONTENT',
    payload: content,
  }),
};
