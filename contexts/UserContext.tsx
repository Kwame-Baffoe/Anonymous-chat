// contexts/UserContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface UserContextProps {
  userId: string;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Check if a user ID exists in localStorage
    let storedUserId = localStorage.getItem('anonymous-chat-user-id');

    if (!storedUserId) {
      // Generate a new UUID
      storedUserId = uuidv4();
      localStorage.setItem('anonymous-chat-user-id', storedUserId);
    }

    setUserId(storedUserId);
  }, []);

  return <UserContext.Provider value={{ userId }}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextProps => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
