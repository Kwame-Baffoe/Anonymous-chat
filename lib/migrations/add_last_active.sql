-- Add last_active column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_active'
    ) THEN 
        ALTER TABLE users 
        ADD COLUMN last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        
        CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
        
        -- Update existing users' last_active
        UPDATE users 
        SET last_active = CURRENT_TIMESTAMP;
    END IF;
END $$;
