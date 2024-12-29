-- Add privateKey column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS private_key TEXT;

-- Create index for private_key
CREATE INDEX IF NOT EXISTS idx_users_private_key ON users(private_key);

-- Update existing users with a default private key (you may want to update this with real keys later)
DO $$
BEGIN
    UPDATE users SET private_key = encode(sha256(random()::text::bytea), 'base64') WHERE private_key IS NULL;
    RAISE NOTICE 'Updated users with default private keys';
END $$;

-- Make private_key NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN private_key SET NOT NULL;
