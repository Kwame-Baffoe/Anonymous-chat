import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { validateUserCredentials } from '../../../lib/users';
import { query } from '../../../lib/postgresql';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          console.log('Starting credential validation for email:', credentials.email);
          console.log('Starting credential validation...');
          const user = await validateUserCredentials(credentials.email, credentials.password);
          
          if (!user) {
            console.error(`Invalid credentials for email: ${credentials.email}`);
            return null;
          }

          console.log('Authentication successful for user:', user.email);
          const userData = {
            id: user.id.toString(),
            email: user.email,
            name: user.name
          };
          console.log('Returning user data:', userData);
          
          return userData;
        } catch (error) {
          console.error('Authentication error:', error);
          throw error; // Propagate the error to show proper error message to user
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log('SignIn Callback:', { user, account, profile, email, credentials });
      return true;
    },
    async jwt({ token, user, account, profile }) {
      console.log('JWT Callback - Input:', { token, user, account, profile });
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      console.log('JWT Callback - Output token:', token);
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback - Input:', { session, token });
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.accessToken = token.id as string;
      }
      console.log('Session Callback - Output session:', session);
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug mode to get more detailed logs
  logger: {
    error(code, ...message) {
      console.error('NextAuth Error:', { code, message });
    },
    warn(code, ...message) {
      console.warn('NextAuth Warning:', { code, message });
    },
    debug(code, ...message) {
      console.log('NextAuth Debug:', { code, message });
    },
  },
  events: {
    async signIn({ user }) {
      // Update last login time
      try {
        await query(
          'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );
      } catch (error) {
        console.error('Error updating last login time:', error);
      }
    },
  },
};

export default NextAuth(authOptions);
