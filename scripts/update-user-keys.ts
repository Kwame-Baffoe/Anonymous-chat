import { query } from '../lib/postgresql';
import { CryptoService } from '../services/CryptoService';

async function updateUserKeys() {
  try {
    // First run the SQL migration
    const sqlPath = './lib/migrations/update_user_keys.sql';
    const fs = require('fs');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await query(sql);

    // Then update each user with proper NaCl keys
    const users = await query('SELECT id FROM users WHERE private_key = $1', ['PENDING_UPDATE']);
    
    for (const user of users.rows) {
      const keyPair = CryptoService.generateKeyPair();
      await query(
        'UPDATE users SET private_key = $1 WHERE id = $2',
        [keyPair.privateKey, user.id]
      );
      console.log(`Updated keys for user ${user.id}`);
    }

    console.log('Successfully updated all user keys');
  } catch (error) {
    console.error('Error updating user keys:', error);
    process.exit(1);
  }
}

updateUserKeys().then(() => process.exit(0));
