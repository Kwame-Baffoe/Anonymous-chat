import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import ProtectedRoute from '../components/ProtectedRoute';

interface Room {
  _id: string;
  name: string;
  createdAt: string;
}

const HomePage = () => {
  const { data: session, status } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (session) {
      fetchRooms();
    }
  }, [session]);

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

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      setError('Room name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/rooms', { name: newRoomName.trim() });
      if (response.data.success) {
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

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to Chat Rooms</h1>
          <p className="mb-4">Please log in to access the chat rooms.</p>
          <Link href="/login" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Chat Rooms</h1>
        <div className="flex items-center space-x-4">
          <span>Welcome, {session.user?.name}</span>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="mb-8">
        <h2 className="text-xl mb-2">Create a New Room</h2>
        <div className="flex items-center">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Enter room name"
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="ml-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      <div>
        <h2 className="text-xl mb-4">Available Rooms</h2>
        {rooms.length === 0 ? (
          <p>No rooms available. Create one!</p>
        ) : (
          <ul className="space-y-4">
            {rooms.map((room) => (
              <li key={room._id} className="bg-white p-4 rounded-md shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">{room.name}</h3>
                    <p className="text-sm text-gray-500">
                      Created at: {new Date(room.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/rooms/${room._id}`}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Join Room
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HomePage;