import axios from 'axios';
import { Room } from '../interfaces/Room';
import { User } from '../interfaces/User';
import { Message } from '../interfaces/Message';
import { ApiResponse } from '../types/api';
import { Logger } from './Logger';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatApi = {
  // Room operations
  createRoom: async (roomName: string): Promise<Room> => {
    try {
      const { data } = await api.post<Room>('/rooms', { name: roomName });
      return data;
    } catch (error) {
      Logger.error('Error creating room:', error);
      throw new Error('Failed to create room');
    }
  },

  // Message operations
  sendMessage: async (roomId: string, content: string, attachments: any[] = []): Promise<Message> => {
    try {
      const { data } = await api.post<Message>(`/messages`, {
        roomId,
        content,
        attachments,
      });
      return data;
    } catch (error) {
      Logger.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  },

  editMessage: async (messageId: string, content: string): Promise<Message> => {
    try {
      const { data } = await api.put<Message>(`/messages/${messageId}`, {
        content,
      });
      return data;
    } catch (error) {
      Logger.error('Error editing message:', error);
      throw new Error('Failed to edit message');
    }
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    try {
      await api.delete(`/messages/${messageId}`);
    } catch (error) {
      Logger.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  },

  // User operations
  updateUserProfile: async (userId: string, profile: Partial<User>): Promise<User> => {
    try {
      const { data } = await api.put<User>(`/users/profile`, profile);
      return data;
    } catch (error) {
      Logger.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }
  },

  updateUserPresence: async (presence: User['presence']): Promise<void> => {
    try {
      await api.put('/users/presence', { presence });
    } catch (error) {
      Logger.error('Error updating presence:', error);
      throw new Error('Failed to update presence');
    }
  },

  // File upload operations
  uploadAudio: async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', blob, 'audio.webm');
    try {
      const { data } = await api.post<{ url: string }>('/upload-audio', formData);
      return data.url;
    } catch (error) {
      Logger.error('Error uploading audio:', error);
      throw new Error('Failed to upload audio');
    }
  },

  uploadAttachment: async (file: File): Promise<string> => {
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
  },

  // Thread operations
  addMessageToThread: async (
    parentId: string,
    content: string,
    roomId: string
  ): Promise<Message> => {
    try {
      const { data } = await api.post<Message>(`/messages/${parentId}/replies`, {
        content,
        roomId,
      });
      return data;
    } catch (error) {
      Logger.error('Error adding reply to thread:', error);
      throw new Error('Failed to add reply');
    }
  },

  getThreadMessages: async (parentId: string): Promise<Message[]> => {
    try {
      const { data } = await api.get<Message[]>(`/messages/${parentId}/replies`);
      return data;
    } catch (error) {
      Logger.error('Error fetching thread messages:', error);
      throw new Error('Failed to fetch thread messages');
    }
  },

  // Message reactions
  addMessageReaction: async (
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> => {
    try {
      await api.post(`/messages/${messageId}/reactions`, {
        emoji,
        userId,
      });
    } catch (error) {
      Logger.error('Error adding reaction:', error);
      throw new Error('Failed to add reaction');
    }
  },

  removeMessageReaction: async (
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> => {
    try {
      await api.delete(`/messages/${messageId}/reactions`, {
        data: { emoji, userId },
      });
    } catch (error) {
      Logger.error('Error removing reaction:', error);
      throw new Error('Failed to remove reaction');
    }
  },

  // Error handler
  handleApiError: (error: any): never => {
    Logger.error('API Error:', error);
    const message = error.response?.data?.message || 'An unexpected error occurred';
    throw new Error(message);
  },
};
