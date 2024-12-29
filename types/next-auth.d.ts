import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    privateKey: string;
    presence?: 'online' | 'away' | 'busy' | 'offline';
  }

  interface Session {
    user: User;
  }
}
