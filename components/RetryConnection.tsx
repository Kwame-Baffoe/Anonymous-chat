import React, { useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';

export const RetryConnection: React.FC = () => {
  const { reconnect } = useContext(SocketContext);

  const { error } = useContext(SocketContext);
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            {error ? `Connection error: ${error.message}` : 'Failed to connect to chat server'}
          </span>
        </div>
        <button
          onClick={reconnect}
          className="px-4 py-2 bg-white text-red-500 rounded-md hover:bg-red-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
};
