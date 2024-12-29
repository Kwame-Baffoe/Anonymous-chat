import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { User } from '../interfaces/User';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const useOnlineUsers = () => {
  return useQuery({
    queryKey: ['onlineUsers'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/users/online');
      return data;
    },
  });
};
