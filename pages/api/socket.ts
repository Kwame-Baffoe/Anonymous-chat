import { io, Socket } from 'socket.io-client';

// Type definitions
export interface User {
  _id: string;
  username: string;
  email: string;
  profilePicture?: string;
  online: boolean;
  presence: 'online' | 'away' | 'busy' | 'offline';
}

export interface Room {
  _id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  lastMessage?: string;
  lastMessageAt?: string;
  publicKey: string;
}

export interface Attachment {
  _id: string;
  filename: string;
  url: string;
  contentType: string;
}

export interface Message {
  _id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  reactions: { [emoji: string]: string[] };
  attachments?: Attachment[];
  isEdited?: boolean;
  readBy?: string[];
  parentId?: string;
  thread?: Message[];
}

export interface CallData {
  callId: string;
  initiator: string;
  receiver: string;
  roomId: string;
  type: 'audio' | 'video';
}

class SocketHandler {
  private static instance: SocketHandler;
  private socket: Socket | null = null;
  private eventListeners: { [key: string]: ((data: any) => void)[] } = {};

  private constructor() {}

  static getInstance(): SocketHandler {
    if (!SocketHandler.instance) {
      SocketHandler.instance = new SocketHandler();
    }
    return SocketHandler.instance;
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io('/api/socket', {
        auth: { token },
        transports: ['websocket'],
        upgrade: false,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        resolve();
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error);
        reject(error);
      });

      this.setupEventListeners();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    const events = [
      'newMessage',
      'messageEdited',
      'messageDeleted',
      'updateReactions',
      'userJoined',
      'userLeft',
      'userTyping',
      'userStoppedTyping',
      'userStatusChanged',
      'userPresenceChanged',
      'onlineUsers',
      'recentMessages',
      'error',
      'callUser',
      'callAccepted',
      'callDeclined',
      'userBusy',
      'endCall',
    ];

    events.forEach(event => {
      this.socket!.on(event, (data: any) => {
        this.triggerEvent(event, data);
      });
    });
  }

  private triggerEvent(event: string, data: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(listener => listener(data));
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        listener => listener !== callback
      );
    }
  }

  emit(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    } else {
      console.error('Socket is not connected');
    }
  }

  joinRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('joinRoom', { roomId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  }

  leaveRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('leaveRoom', roomId, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to leave room'));
        }
      });
    });
  }

  sendMessage(roomId: string, content: string, attachments?: Attachment[]): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('sendMessage', { roomId, content, attachments }, (response: { success: boolean; error?: string; messageId?: string }) => {
        if (response.success && response.messageId) {
          resolve(response.messageId);
        } else {
          reject(new Error(response.error || 'Failed to send message'));
        }
      });
    });
  }

  editMessage(messageId: string, newContent: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('editMessage', { messageId, newContent }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to edit message'));
        }
      });
    });
  }

  deleteMessage(messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('deleteMessage', { messageId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to delete message'));
        }
      });
    });
  }

  reactToMessage(messageId: string, emoji: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('reactMessage', { messageId, emoji }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to react to message'));
        }
      });
    });
  }

  startTyping(roomId: string): void {
    if (this.socket) {
      this.socket.emit('typing', { roomId });
    }
  }

  stopTyping(roomId: string): void {
    if (this.socket) {
      this.socket.emit('stopTyping', { roomId });
    }
  }

  updatePresence(presence: 'online' | 'away' | 'busy' | 'offline'): void {
    if (this.socket) {
      this.socket.emit('updatePresence', { presence });
    }
  }

  getOnlineUsers(roomId: string): Promise<User[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('getOnlineUsers', { roomId }, (response: { success: boolean; users?: User[]; error?: string }) => {
        if (response.success && response.users) {
          resolve(response.users);
        } else {
          reject(new Error(response.error || 'Failed to get online users'));
        }
      });
    });
  }

  getRecentMessages(roomId: string, limit: number = 50): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('getRecentMessages', { roomId, limit }, (response: { success: boolean; messages?: Message[]; error?: string }) => {
        if (response.success && response.messages) {
          resolve(response.messages);
        } else {
          reject(new Error(response.error || 'Failed to get recent messages'));
        }
      });
    });
  }

  initiateCall(roomId: string, callType: 'audio' | 'video'): void {
    if (this.socket) {
      this.socket.emit('initiateCall', { roomId, callType });
    }
  }

  acceptCall(callId: string): void {
    if (this.socket) {
      this.socket.emit('acceptCall', { callId });
    }
  }

  declineCall(callId: string): void {
    if (this.socket) {
      this.socket.emit('declineCall', { callId });
    }
  }

  endCall(callId: string): void {
    if (this.socket) {
      this.socket.emit('endCall', { callId });
    }
  }

  sendCallSignal(callId: string, signal: any): void {
    if (this.socket) {
      this.socket.emit('callSignal', { callId, signal });
    }
  }

  addMessageToThread(parentMessageId: string, content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('addMessageToThread', { parentMessageId, content }, (response: { success: boolean; error?: string; messageId?: string }) => {
        if (response.success && response.messageId) {
          resolve(response.messageId);
        } else {
          reject(new Error(response.error || 'Failed to add message to thread'));
        }
      });
    });
  }

  getThreadMessages(parentMessageId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('getThreadMessages', { parentMessageId }, (response: { success: boolean; messages?: Message[]; error?: string }) => {
        if (response.success && response.messages) {
          resolve(response.messages);
        } else {
          reject(new Error(response.error || 'Failed to get thread messages'));
        }
      });
    });
  }

  searchMessages(roomId: string, query: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('searchMessages', { roomId, query }, (response: { success: boolean; messages?: Message[]; error?: string }) => {
        if (response.success && response.messages) {
          resolve(response.messages);
        } else {
          reject(new Error(response.error || 'Failed to search messages'));
        }
      });
    });
  }

  markMessagesAsRead(roomId: string, messageIds: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('markMessagesAsRead', { roomId, messageIds }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to mark messages as read'));
        }
      });
    });
  }
}

export default SocketHandler.getInstance();