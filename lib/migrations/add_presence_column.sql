-- Add presence column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS presence VARCHAR(20) DEFAULT 'offline';

-- Create index for presence to optimize online users query
CREATE INDEX IF NOT EXISTS idx_users_presence ON users(presence);
