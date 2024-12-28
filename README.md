# Anonymous Chat

A real-time anonymous chat application built with Next.js and PostgreSQL.

## Database Setup

1. Install PostgreSQL on your system if you haven't already:
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`
   - Windows: Download from https://www.postgresql.org/download/windows/

2. Create and set up the database:
   ```bash
   # Login as postgres user
   psql -U postgres

   # Create database
   CREATE DATABASE anonymous_chat;

   # Connect to the database
   \c anonymous_chat

   # Run the schema (from another terminal)
   psql -U postgres -d anonymous_chat -f lib/schema.sql

   # Grant privileges
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
   ```

3. Update your environment variables in `.env.local`:
   ```env
   # PostgreSQL Configuration
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=anonymous_chat

   # NextAuth Configuration
   NEXTAUTH_SECRET=your_secret_here
   NEXTAUTH_URL=http://localhost:3000
   ```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Real-time chat with WebSocket support
- User authentication
- Create and join chat rooms
- Send text and audio messages
- Secure password hashing
- Rate limiting
- XSS protection

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=anonymous_chat

# NextAuth Configuration
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
```

## API Routes

- `/api/auth/*` - Authentication endpoints
- `/api/messages` - Message operations
- `/api/rooms` - Chat room operations

## Database Schema

The PostgreSQL database includes the following tables:

- `users` - User accounts and profiles
- `rooms` - Chat rooms
- `messages` - Chat messages
- `room_participants` - Room membership
- `sessions` - User sessions

## Security

- Password hashing with bcrypt
- JWT session tokens
- SQL injection protection
- XSS prevention with sanitize-html
- Rate limiting on API routes
- Parameterized SQL queries

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
