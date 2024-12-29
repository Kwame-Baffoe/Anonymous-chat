import { query } from '../lib/postgresql';
import { CryptoService } from '../services/CryptoService';

async function updateRoomKeys() {
  try {
    // First run the SQL migration
    const sqlPath = './lib/migrations/add_room_public_key.sql';
    const fs = require('fs');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await query(sql);

    // Then update each room with proper keys
    const rooms = await query('SELECT id FROM rooms WHERE public_key = $1', ['PENDING_UPDATE']);
    
    for (const room of rooms.rows) {
      try {
        const keyPair = await CryptoService.generateKeyPair();
        await query(
          'UPDATE rooms SET public_key = $1 WHERE id = $2',
          [keyPair.publicKey, room.id]
        );
        console.log(`Updated keys for room ${room.id}`);
      } catch (roomError) {
        console.error(`Failed to update keys for room ${room.id}:`, roomError);
        // Continue with other rooms even if one fails
      }
    }

    console.log('Successfully updated all room keys');
  } catch (error) {
    console.error('Error updating room keys:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

updateRoomKeys().then(() => process.exit(0));
