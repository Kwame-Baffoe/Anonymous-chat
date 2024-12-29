import React from 'react';
import { User, LogOut } from 'react-feather';
import { User as UserType } from '../interfaces/User';
import Swal from 'sweetalert2';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Logger } from '../utils/Logger';

interface HeaderProps {
  user: UserType;
  isConnected: boolean;
  onUserProfileClick: () => void;
  onPresenceChange: (presence: UserType['presence']) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isConnected,
  onUserProfileClick,
  onPresenceChange,
}) => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'You will be logged out of your session.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, log out!',
      });

      if (result.isConfirmed) {
        await signOut({ redirect: false });
        Swal.fire(
          'Logged Out!',
          'You have been successfully logged out.',
          'success'
        ).then(() => {
          router.push('/login');
        });
      }
    } catch (error) {
      Logger.error('Error signing out:', error);
      Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
    }
  };

  return (
    <header className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-indigo-600">Chat Application</h1>
      <div className="flex items-center space-x-4">
        {/* User Profile Button */}
        <button
          onClick={onUserProfileClick}
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
          aria-label="View profile"
        >
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt=""
              className="w-8 h-8 rounded-full mr-2"
            />
          ) : (
            <User size={20} className="mr-2" aria-hidden="true" />
          )}
          <span className="font-medium">{user.username}</span>
        </button>

        {/* Presence Selector */}
        <select
          value={user.presence}
          onChange={(e) => onPresenceChange(e.target.value as UserType['presence'])}
          className="bg-gray-100 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Set user presence"
        >
          <option value="online">Online</option>
          <option value="away">Away</option>
          <option value="busy">Do not disturb</option>
          <option value="offline">Appear Offline</option>
        </select>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="text-red-600 hover:text-red-800 flex items-center"
          aria-label="Logout"
        >
          <LogOut size={20} className="mr-2" aria-hidden="true" />
          <span>Logout</span>
        </button>

        {/* Connection Status Indicator */}
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
          aria-label={isConnected ? 'Connected' : 'Disconnected'}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
      </div>
    </header>
  );
};
