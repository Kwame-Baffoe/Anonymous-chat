// components/MessageList.tsx

import Image from 'next/image';
import { useUser } from '../contexts/UserContext';

interface Message {
  senderId: string;
  message: string;
  timestamp: string; // ISO string
}

interface MessageListProps {
  messages: Message[];
}

const MessageList = ({ messages }: MessageListProps) => {
  const { user } = useUser();

  return (
    <div className="space-y-6">
      {messages.map((msg, index) => {
        const isOwnMessage = user?.name === msg.senderId;
        return (
          <div
            key={index}
            className={`flex ${
              isOwnMessage ? 'justify-end' : 'justify-start'
            }`}
          >
            {!isOwnMessage && (
              <div className="mr-2">
                {/* Placeholder Avatar */}
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">
                    {msg.senderId.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center">
                {!isOwnMessage && (
                  <span className="font-semibold mr-2">{msg.senderId}</span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div
                className={`mt-1 px-4 py-2 rounded-lg ${
                  isOwnMessage
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {msg.message}
              </div>
            </div>
            {isOwnMessage && (
              <div className="ml-2">
                {/* Placeholder Avatar */}
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">
                    {msg.senderId.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
