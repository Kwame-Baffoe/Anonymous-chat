// pages/index.tsx

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Header from '../components/Header';
import { useSession } from 'next-auth/react';

interface Room {
  _id: string;
  name: string;
  createdAt: string;
}

const HomePage = () => {
  const { data: session } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch available rooms on component mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get('/api/rooms');
        if (response.data.success) {
          setRooms(response.data.rooms || []);
        } else {
          setError(response.data.error || 'Failed to fetch rooms');
        }
      } catch (err) {
        setError('An error occurred while fetching rooms');
      }
    };

    fetchRooms();
  }, []);

  // Handle room creation
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      setError('Room name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/rooms', { name: newRoomName.trim() });
      if (response.data.success) {
        // Add the new room to the list
        setRooms((prev) => [...prev, response.data.room!]);
        setNewRoomName('');
        setError(null);
      } else {
        setError(response.data.error || 'Failed to create room');
      }
    } catch (err) {
      setError('An error occurred while creating the room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Create Room Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Create a New Room</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name"
              className="w-full sm:w-1/2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreateRoom}
              disabled={loading || !session}
              className={`mt-4 sm:mt-0 sm:ml-4 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:bg-blue-300 ${
                !session ? 'cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
          {!session && (
            <p className="text-red-500 mt-2">
              You must be signed in to create a room.
            </p>
          )}
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </section>

        {/* List of Rooms */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Available Rooms</h2>
          {rooms.length === 0 ? (
            <p className="text-gray-700">No rooms available. Create one!</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <li key={room._id} className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{room.name}</h3>
                    <p className="text-sm text-gray-500">
                      Created at: {new Date(room.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Link href={`/rooms/${room._id}`}>
                    <a className="mt-4 inline-block text-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition">
                      Join Room
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default HomePage;
