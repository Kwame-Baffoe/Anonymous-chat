import { Pool } from 'pg';

if (!process.env.POSTGRES_USER || !process.env.POSTGRES_PASSWORD || !process.env.POSTGRES_HOST || !process.env.POSTGRES_DB) {
  throw new Error('Please add PostgreSQL credentials to .env.local');
}

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Add error handler to the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Add connect handler to verify connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to database');
    done();
  }
});

export async function query(text: string, params?: any[]) {
  let client;
  try {
    console.log('Attempting to establish database connection...');
    client = await pool.connect();
    console.log('Database connection established successfully');
    
    console.log('Executing query:', {
      text,
      params,
      timestamp: new Date().toISOString()
    });
    
    const result = await client.query(text, params);
    console.log('Query result:', {
      rowCount: result.rowCount,
      fields: result.fields.map(f => f.name),
      timestamp: new Date().toISOString()
    });
    
    if (result.rows.length > 0) {
      console.log('Sample row (first row):', {
        ...result.rows[0],
        password: result.rows[0]?.password ? '[REDACTED]' : undefined
      });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        throw new Error('Database connection failed. Please try again later.');
      }
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error('An unexpected database error occurred');
  } finally {
    if (client) {
      console.log('Releasing database connection');
      client.release();
    }
  }
}

export async function transaction<T>(callback: (client: any) => Promise<T>) {
  let client;
  try {
    client = await pool.connect();
    console.log('Transaction: Beginning database transaction');
    
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    
    console.log('Transaction: Successfully committed');
    return result;
  } catch (error) {
    console.error('Transaction error:', error);
    if (client) {
      console.log('Transaction: Rolling back due to error');
      await client.query('ROLLBACK');
    }
    if (error instanceof Error) {
      throw new Error(`Transaction failed: ${error.message}`);
    }
    throw new Error('Transaction failed: An unexpected error occurred');
  } finally {
    if (client) {
      console.log('Transaction: Releasing database connection');
      client.release();
    }
  }
}

export default pool;
