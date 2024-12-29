-- Add public_key column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Create index for public_key
CREATE INDEX IF NOT EXISTS idx_rooms_public_key ON rooms(public_key);

-- Create a temporary function to update room keys
CREATE OR REPLACE FUNCTION update_room_keys() RETURNS void AS $$
DECLARE
    room_record RECORD;
BEGIN
    FOR room_record IN SELECT id FROM rooms WHERE public_key IS NULL
    LOOP
        -- Update each room's public_key with a placeholder
        -- The actual key generation will happen in the Node.js script
        UPDATE rooms 
        SET public_key = 'PENDING_UPDATE' 
        WHERE id = room_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT update_room_keys();

-- Drop the function
DROP FUNCTION update_room_keys();

-- Make public_key NOT NULL after setting defaults
ALTER TABLE rooms ALTER COLUMN public_key SET NOT NULL;
