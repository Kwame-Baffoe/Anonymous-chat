import 'next-auth';
import { SessionUser } from '../interfaces/User';

declare module 'next-auth' {
  interface Session {
    user: SessionUser;
    accessToken: string;
  }

  interface User extends SessionUser {}
}
