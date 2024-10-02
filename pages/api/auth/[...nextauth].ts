// pages/api/auth/[...nextauth].ts

import NextAuth from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '../../../lib/mongodb';

export default NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    // Add more providers here if needed
  ],
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, user }) {
      // Attach user ID to the session
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
