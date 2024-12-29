-- Create a temporary function to update user keys
CREATE OR REPLACE FUNCTION update_user_keys() RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM users
    LOOP
        -- Update each user's private_key with a placeholder
        -- The actual key generation will happen in the Node.js script
        UPDATE users 
        SET private_key = 'PENDING_UPDATE' 
        WHERE id = user_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT update_user_keys();

-- Drop the function
DROP FUNCTION update_user_keys();
