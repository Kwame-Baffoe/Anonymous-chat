import React from 'react';

interface Message {
  senderId: string;
  message: string;
  timestamp: string;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`mb-4 ${msg.senderId === currentUserId ? 'text-right' : 'text-left'}`}
        >
          <div
            className={`inline-block p-2 rounded-lg ${
              msg.senderId === currentUserId ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            <p>{msg.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(msg.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;