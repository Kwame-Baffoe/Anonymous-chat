import React, { useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';

export const RetryConnection: React.FC = () => {
  const { reconnect } = useContext(SocketContext);

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4">
      <p className="text-red-500">Failed to connect to chat server.</p>
      <button
        onClick={reconnect}
        className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Retry Connection
      </button>
    </div>
  );
};
