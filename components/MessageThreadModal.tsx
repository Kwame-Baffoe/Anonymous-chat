import React, { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

// Integrated Message interface
interface Message {
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

interface Attachment {
  _id: string;
  filename: string;
  url: string;
  contentType: string;
}

// Integrated socketHandler
const socketHandler = {
  socket: null as Socket | null,

  connect(token: string): void {
    this.socket = io('/api/socket', {
      auth: { token },
    });
  },

  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  },

  off(event: string, callback: (data: any) => void): void {
    this.socket?.off(event, callback);
  },

  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  },

  async getThreadMessages(parentId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('getThreadMessages', { parentId }, (response: { success: boolean; messages?: Message[]; error?: string }) => {
        if (response.success && response.messages) {
          resolve(response.messages);
        } else {
          reject(new Error(response.error || 'Failed to get thread messages'));
        }
      });
    });
  },
};

interface MessageThreadModalProps {
  parentMessageId: string;
  onClose: () => void;
  onAddReply: (parentId: string, content: string) => void;
}

export const MessageThreadModal: React.FC<MessageThreadModalProps> = ({
  parentMessageId,
  onClose,
  onAddReply,
}) => {
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    const fetchThreadMessages = async () => {
      try {
        const messages = await socketHandler.getThreadMessages(parentMessageId);
        setThreadMessages(messages);
      } catch (error) {
        console.error('Error fetching thread messages:', error);
      }
    };

    fetchThreadMessages();

    const handleNewThreadMessage = (message: Message) => {
      if (message.parentId === parentMessageId) {
        setThreadMessages((prevMessages) => [...prevMessages, message]);
      }
    };

    socketHandler.on('newMessage', handleNewThreadMessage);

    return () => {
      socketHandler.off('newMessage', handleNewThreadMessage);
    };
  }, [parentMessageId]);

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim()) {
      onAddReply(parentMessageId, replyContent);
      setReplyContent('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Message Thread</h2>
        <div className="flex-grow overflow-y-auto mb-4">
          {threadMessages.map((message) => (
            <div key={message._id} className="mb-2 p-2 bg-gray-100 rounded">
              <p className="font-semibold">{message.username}</p>
              <p>{message.content}</p>
              <p className="text-xs text-gray-500">
                {new Date(message.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmitReply} className="flex">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Type your reply..."
            className="flex-grow p-2 border rounded-l"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-r"
          >
            Reply
          </button>
        </form>
        <button
          onClick={onClose}
          className="mt-4 bg-gray-300 text-gray-800 px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};