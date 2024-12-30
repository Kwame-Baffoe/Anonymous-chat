import { useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Room } from '../interfaces/Room';
import { ApiResponse } from '../types/api';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RoomResponse {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  public_key: string;
  last_message: string | null;
  last_message_at: string | null;
  last_message_user: string | null;
  participant_count: string;
  is_participant: boolean;
}

const transformRoom = (room: RoomResponse): Room => ({
  _id: room.id,
  name: room.name,
  createdAt: new Date(room.created_at),
  publicKey: room.public_key,
  lastMessage: room.last_message || undefined
});

export const useRooms = () => {
  return useInfiniteQuery({
    queryKey: ['rooms'],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get<{
        results: RoomResponse[];
        nextPage: number | null;
      }>(`/rooms?page=${pageParam}&limit=20`);
      
      return {
        results: data.results.map(transformRoom),
        nextPage: data.nextPage
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined
  });
};
