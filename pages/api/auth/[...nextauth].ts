import NextAuth, { NextAuthOptions, Session, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { validateUserCredentials } from '../../../lib/users';
import { query } from '../../../lib/postgresql';
import { rateLimit } from '../../../lib/rate-limit';

// Define JWT type to match SessionUser fields
interface JWT {
  id: string;
  email: string;
  name: string;
  privateKey: string;
  presence: 'online' | 'away' | 'busy' | 'offline';
  iat?: number;
}

// Create auth_logs table
async function initAuthLogsTable() {
  try {
    // Create table
    await query(`
      CREATE TABLE IF NOT EXISTS auth_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        success BOOLEAN DEFAULT true,
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);
    `);
  } catch (error) {
    console.error('Error initializing auth_logs table:', error);
  }
}

// Initialize tables
initAuthLogsTable().catch(console.error);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Apply rate limiting
          try {
            // Create a minimal request object for rate limiting
            const apiReq = {
              headers: req?.headers || {},
              method: req?.method || 'POST',
              body: req?.body || {},
              query: req?.query || {},
              // Add IP address from headers for rate limiting
              ip: req?.headers?.['x-forwarded-for']?.toString() || 
                  req?.headers?.['x-real-ip']?.toString() || 
                  'unknown'
            };
            
            await rateLimit(apiReq as any, 'login');
          } catch (error) {
            throw new Error('Too many login attempts. Please try again later.');
          }

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
            name: user.name,
            privateKey: user.privateKey,
            presence: 'online' as const
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
    maxAge: 7 * 24 * 60 * 60, // 7 days instead of 30
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days instead of 30
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        console.log('SignIn Callback:', { user, account, profile, email, credentials });
        
        // Log successful login attempt
        await query(
          `INSERT INTO auth_logs (user_id, action, success, ip_address, created_at)
           VALUES ($1, 'login', true, $2, CURRENT_TIMESTAMP)`,
          [user.id, 'unknown'] // IP address logging moved to rate limiting
        );
        
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return true; // Still allow sign in even if logging fails
      }
    },
    async jwt({ token, user, account, profile }) {
      console.log('JWT Callback - Input:', { token, user, account, profile });
      if (user && typeof user === 'object') {
        // Ensure all required fields are present and of correct type
        if (
          'id' in user && typeof user.id === 'string' &&
          'email' in user && typeof user.email === 'string' &&
          'name' in user && typeof user.name === 'string' &&
          'privateKey' in user && typeof user.privateKey === 'string'
        ) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.privateKey = user.privateKey;
          token.presence = (user.presence as 'online' | 'away' | 'busy' | 'offline') || 'online';
          token.iat = Math.floor(Date.now() / 1000);
        } else {
          console.error('Missing or invalid user fields in JWT callback:', user);
          throw new Error('Invalid user data');
        }
      }
      console.log('JWT Callback - Output token:', token);
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback - Input:', { session, token });
      
      // Type guard to ensure token has required fields
      if (
        typeof token.id === 'string' &&
        typeof token.email === 'string' &&
        typeof token.name === 'string' &&
        typeof token.privateKey === 'string' &&
        token.presence &&
        (
          token.presence === 'online' ||
          token.presence === 'away' ||
          token.presence === 'busy' ||
          token.presence === 'offline'
        )
      ) {
        if (session.user) {
          session.user.id = token.id;
          session.user.email = token.email;
          session.user.name = token.name;
          session.user.privateKey = token.privateKey;
          session.user.presence = token.presence;
        }
      } else {
        console.error('Invalid token data in session callback:', token);
        throw new Error('Invalid token data');
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
  debug: process.env.NODE_ENV === 'development', // Only enable debug in development
  logger: {
    error(code, ...message) {
      console.error('NextAuth Error:', { code, message });
    },
    warn(code, ...message) {
      console.warn('NextAuth Warning:', { code, message });
    },
    debug(code, ...message) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Debug:', { code, message });
      }
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
