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

export const useRooms = () => {
  return useInfiniteQuery({
    queryKey: ['rooms'],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get(`/rooms?page=${pageParam}&limit=20`);
      return {
        results: data.results || [],
        nextPage: data.nextPage || null,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: ApiResponse<Room>) => lastPage.nextPage ?? undefined,
  });
};
