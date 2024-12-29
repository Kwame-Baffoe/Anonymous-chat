import { Message } from '../interfaces/Message';
import { CryptoService } from '../services/CryptoService';
import { Logger } from './Logger';

export const messageHelpers = {
  // Format message content for display
  formatMessageContent: (content: string): string => {
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.replace(urlRegex, (url) => `[${url}](${url})`);
  },

  // Decrypt message content
  decryptMessage: async (
    encryptedContent: string,
    roomPublicKey: string,
    userPrivateKey: string
  ): Promise<string> => {
    try {
      return await CryptoService.decrypt(
        encryptedContent,
        roomPublicKey,
        userPrivateKey
      );
    } catch (error) {
      Logger.error('Decryption error:', error);
      return '[Unable to decrypt message]';
    }
  },

  // Encrypt message content
  encryptMessage: async (
    content: string,
    roomPublicKey: string,
    userPrivateKey: string
  ): Promise<string> => {
    try {
      return await CryptoService.encrypt(content, roomPublicKey, userPrivateKey);
    } catch (error) {
      Logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  },

  // Validate message content
  validateMessage: (content: string): boolean => {
    // Message should not be empty or only whitespace
    if (!content.trim()) {
      return false;
    }

    // Message should not exceed maximum length (e.g., 2000 characters)
    if (content.length > 2000) {
      return false;
    }

    return true;
  },

  // Format timestamp for display
  formatTimestamp: (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;

    if (diffInHours < 24) {
      // Show time for messages from today
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 48) {
      // Show "Yesterday" for messages from yesterday
      return `Yesterday ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else {
      // Show full date for older messages
      return date.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  },

  // Group messages by date
  groupMessagesByDate: (messages: Message[]): { [date: string]: Message[] } => {
    return messages.reduce((groups: { [date: string]: Message[] }, message) => {
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {});
  },

  // Check if message contains mentions
  parseMentions: (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);
    return mentions ? mentions.map((mention) => mention.slice(1)) : [];
  },

  // Check if message contains commands
  parseCommands: (content: string): { command: string; args: string[] } | null => {
    if (!content.startsWith('/')) {
      return null;
    }

    const parts = content.slice(1).split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    return { command, args };
  },

  // Format message preview (for notifications, room last message, etc.)
  getMessagePreview: (message: Message, maxLength: number = 50): string => {
    let preview = message.content;

    // If message has attachments, add attachment info
    if (message.attachments && message.attachments.length > 0) {
      preview = `[${message.attachments.length} attachment${
        message.attachments.length > 1 ? 's' : ''
      }] ${preview}`;
    }

    // Truncate if necessary
    if (preview.length > maxLength) {
      preview = `${preview.substring(0, maxLength)}...`;
    }

    return preview;
  },

  // Check if a message should trigger a notification
  shouldNotify: (message: Message, currentUserId: string): boolean => {
    // Don't notify for own messages
    if (message.userId === currentUserId) {
      return false;
    }

    // Always notify for direct mentions
    if (messageHelpers.parseMentions(message.content).includes(currentUserId)) {
      return true;
    }

    // Add other notification rules as needed
    return true;
  },

  // Get message status
  getMessageStatus: (message: Message): 'sent' | 'delivered' | 'read' => {
    if (message.status) {
      return message.status;
    }
    if (message.readBy && message.readBy.length > 0) {
      return 'read';
    }
    if (message.deliveredAt) {
      return 'delivered';
    }
    return 'sent';
  },

  // Check if message is system message
  isSystemMessage: (message: Message): boolean => {
    return message.type === 'system' || false;
  },

  // Check if message contains code block
  hasCodeBlock: (content: string): boolean => {
    return content.includes('```');
  },

  // Extract code blocks from message
  extractCodeBlocks: (content: string): { code: string; language: string }[] => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: { code: string; language: string }[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'plaintext',
        code: match[2],
      });
    }

    return blocks;
  },
};
