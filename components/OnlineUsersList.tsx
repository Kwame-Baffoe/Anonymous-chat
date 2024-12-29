import React from 'react';
import { User } from '../interfaces/User';
import Spinner from './Spinner';

interface OnlineUsersListProps {
  users: User[];
  isLoading: boolean;
}

export const OnlineUsersList: React.FC<OnlineUsersListProps> = ({
  users,
  isLoading,
}) => {
  const getPresenceColor = (presence: User['presence']) => {
    switch (presence) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPresenceLabel = (presence: User['presence']) => {
    switch (presence) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Do not disturb';
      default:
        return 'Offline';
    }
  };

  return (
    <aside
      className="w-64 bg-white border-l border-gray-200 p-4"
      aria-label="Online users"
    >
      <h3 className="font-semibold mb-4 text-gray-700">Online Users</h3>
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3">
          {users.length === 0 ? (
            <p className="text-gray-500 text-center">No users online</p>
          ) : (
            users.map((user) => (
              <div
                key={user._id}
                className="flex items-center group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200"
              >
                <div className="relative">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getPresenceColor(
                      user.presence
                    )}`}
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {getPresenceLabel(user.presence)}
                  </p>
                </div>
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={`View ${user.username}'s profile`}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* User count */}
      {!isLoading && users.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {users.length} user{users.length !== 1 ? 's' : ''} online
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Status Legend
        </h4>
        <div className="space-y-2">
          {[
            { status: 'online', label: 'Online' },
            { status: 'away', label: 'Away' },
            { status: 'busy', label: 'Do not disturb' },
            { status: 'offline', label: 'Offline' },
          ].map(({ status, label }) => (
            <div key={status} className="flex items-center text-sm">
              <div
                className={`w-2 h-2 rounded-full ${getPresenceColor(
                  status as User['presence']
                )} mr-2`}
                aria-hidden="true"
              />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
