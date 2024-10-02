// components/UserContext.tsx

import { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';

interface UserContextType {
  user: {
    name: string;
    email: string;
    image: string;
    id: string;
  } | null;
}

const UserContext = createContext<UserContextType>({ user: null });

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC = ({ children }) => {
  const { data: session } = useSession();

  const user = session
    ? {
        name: session.user?.name || 'Anonymous',
        email: session.user?.email || '',
        image: session.user?.image || '',
        id: session.userId || '',
      }
    : null;

  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
};
