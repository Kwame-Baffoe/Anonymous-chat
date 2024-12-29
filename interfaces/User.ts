export interface User {
  _id: string;
  username: string;
  email: string;
  profilePicture?: string;
  online: boolean;
  presence: 'online' | 'away' | 'busy' | 'offline';
  privateKey: string;
}
