export interface User {
  _id: string;
  id: string;  // Alias for _id for compatibility
  username: string;
  email: string;
  profilePicture?: string;
  online: boolean;
  presence: 'online' | 'away' | 'busy' | 'offline';
  privateKey: string;
}
