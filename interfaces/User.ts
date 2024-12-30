export interface User {
  id: string;
  _id?: string;  // For MongoDB compatibility
  name?: string | null;
  username?: string;
  email?: string | null;
  image?: string | null;
  profilePicture?: string;
  online?: boolean;
  presence?: 'online' | 'away' | 'busy' | 'offline';
  privateKey?: string;
}

export interface DBUser {
  _id: string;
  id?: string;
  username: string;
  name: string;
  email: string;
  image?: string;
  profilePicture?: string;
  online: boolean;
  presence: 'online' | 'away' | 'busy' | 'offline';
  privateKey: string;
}

export interface SessionUser extends User {
  id: string;
  name: string;
  email: string;
  privateKey: string;
  presence: 'online' | 'away' | 'busy' | 'offline';
}
