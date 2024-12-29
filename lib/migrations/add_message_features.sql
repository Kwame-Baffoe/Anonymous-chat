-- Add public_key and created_by to rooms table
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS public_key TEXT,
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Add message features
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS read_by INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES messages(id),
ADD COLUMN IF NOT EXISTS thread JSONB DEFAULT '[]';

-- Create index for parent_id to optimize thread queries
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_id);
