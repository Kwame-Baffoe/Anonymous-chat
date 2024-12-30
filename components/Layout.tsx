import React, { ReactNode } from 'react';
import { Header } from './Header';
import { User } from '../interfaces/User';
import { ErrorBoundary } from 'react-error-boundary';
import Spinner from './Spinner';

import { RetryConnection } from './RetryConnection';

interface LayoutProps {
  children: ReactNode;
  user: User;
  isConnected: boolean;
  socketError: Error | null;
  isLoading?: boolean;
  onUserProfileClick: () => void;
  onPresenceChange: (presence: User['presence']) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  isConnected,
  socketError,
  isLoading = false,
  onUserProfileClick,
  onPresenceChange,
}) => {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div
          className="flex flex-col items-center justify-center h-screen bg-gray-50"
          role="alert"
        >
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Oops! Something went wrong
            </h1>
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-red-700">{error.message}</p>
            </div>
            <button
              onClick={resetErrorBoundary}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-300"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    >
      <div className="h-screen flex flex-col bg-gray-100">
        <Header
          user={user}
          isConnected={isConnected}
          onUserProfileClick={onUserProfileClick}
          onPresenceChange={onPresenceChange}
        />
        
        {socketError ? (
          <div className="flex-1 flex items-center justify-center">
            <RetryConnection />
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <main className="flex-1 flex overflow-hidden">
            {children}
          </main>
        )}

        {/* Accessibility skip link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white"
        >
          Skip to main content
        </a>

        {/* Screen reader announcements */}
        <div
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {isConnected ? 'Connected to chat server' : 'Disconnected from chat server'}
        </div>
      </div>
    </ErrorBoundary>
  );
};
