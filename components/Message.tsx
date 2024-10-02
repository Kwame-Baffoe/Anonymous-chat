// components/Message.tsx
import React from 'react';

interface MessageProps {
  message: string;
  sender: string;
  timestamp: string;
  isOwnMessage: boolean;
}

const Message: React.FC<MessageProps> = ({ message, sender, timestamp, isOwnMessage }) => {
  return (
    <div
      className={`mb-4 p-2 rounded max-w-md ${
        isOwnMessage ? 'bg-blue-200 self-end' : 'bg-gray-200'
      }`}
    >
      <span className="font-semibold">
        {isOwnMessage ? 'You' : `User ${sender.slice(0, 5)}`}
        :
      </span>{' '}
      <span>{message}</span>
      <div className="text-xs text-gray-500">
        {new Date(timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default Message;
