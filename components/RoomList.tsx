import React, { useState } from 'react';
import { Room } from '../interfaces/Room';
import { MessageSquare, Search, X, PlusCircle } from 'react-feather';
import Spinner from './Spinner';
import Swal from 'sweetalert2';
import { chatApi } from '../utils/api';
import { useQueryClient } from '@tanstack/react-query';

interface RoomListProps {
  rooms: Room[];
  selectedRoomId: string | null;
  isLoading: boolean;
  hasMore: boolean;
  onRoomSelect: (room: Room) => void;
  onLoadMore: () => void;
}

export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  selectedRoomId,
  isLoading,
  hasMore,
  onRoomSelect,
  onLoadMore,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const handleCreateRoom = async () => {
    const result = await Swal.fire({
      title: 'Create New Room',
      input: 'text',
      inputLabel: 'Room Name',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!';
        }
        return null;
      },
    });

    if (result.isConfirmed && result.value) {
      try {
        const newRoom = await chatApi.createRoom(result.value);
        queryClient.setQueryData(['rooms'], (oldData: any) => {
          if (!oldData) return { pages: [{ results: [newRoom], nextPage: null }] };
          return {
            ...oldData,
            pages: [
              {
                ...oldData.pages[0],
                results: [newRoom, ...(oldData.pages[0]?.results || [])]
              },
              ...oldData.pages.slice(1)
            ]
          };
        });
        Swal.fire('Success', 'Room created successfully', 'success');
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to create room';
        Swal.fire('Error', errorMessage, 'error');
      }
    }
  };

  const filteredRooms = rooms.filter((room) => {
    const query = searchQuery.toLowerCase();
    return (
      (room?.name && room.name.toLowerCase().includes(query)) ||
      (room?.lastMessage && room.lastMessage.toLowerCase().includes(query))
    );
  });

  return (
    <aside
      className="w-64 bg-white border-r border-gray-200 flex flex-col"
      aria-label="Chat rooms"
    >
      {/* Search bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            aria-label="Search rooms"
          />
          <Search
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
            aria-hidden="true"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && rooms.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <Spinner />
          </div>
        ) : (
          <>
            {filteredRooms.map((room) => (
              <div
                key={room._id}
                className={`p-4 hover:bg-gray-100 cursor-pointer transition-colors duration-200 ${
                  selectedRoomId === room._id ? 'bg-indigo-100' : ''
                } ${
                  searchQuery &&
                  ((room?.name && room.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (room?.lastMessage && room.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())))
                    ? 'ring-2 ring-indigo-300'
                    : ''
                }`}
                onClick={() => onRoomSelect(room)}
                role="button"
                aria-pressed={selectedRoomId === room._id}
                tabIndex={0}
              >
                <div className="flex items-center">
                  <MessageSquare
                    size={20}
                    className="mr-2 text-indigo-600"
                    aria-hidden="true"
                  />
                  <span className="font-medium">{room.name}</span>
                </div>
                {room.lastMessage && (
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {room.lastMessage}
                  </p>
                )}
              </div>
            ))}
            {hasMore && !isLoading && (
              <button
                onClick={onLoadMore}
                className="w-full p-3 text-center text-indigo-600 hover:bg-gray-100"
              >
                Load More Rooms
              </button>
            )}
          </>
        )}
      </div>

      {/* Create room button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleCreateRoom}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-300 flex items-center justify-center"
          aria-label="Create new room"
        >
          <PlusCircle size={20} className="mr-2" aria-hidden="true" />
          Create New Room
        </button>
      </div>
    </aside>
  );
};
