import { useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

export function useOnlineStatus() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    // Update online status every minute
    const updateOnlineStatus = () => {
      axios.post('/api/users/online').catch(console.error);
    };

    // Initial update
    updateOnlineStatus();

    // Set up interval
    const interval = setInterval(updateOnlineStatus, 60000);

    return () => clearInterval(interval);
  }, [session]);
}
