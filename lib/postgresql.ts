import { Pool, QueryResult } from 'pg';

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
    rejectUnauthorized: true
  } : undefined,
  max: parseInt(process.env.POSTGRES_POOL_MAX || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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

export async function query(text: string, params?: any[]): Promise<QueryResult<any>> {
  const retries = 3;
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    let client;
    try {
      console.log('Attempting to establish database connection...');
      client = await pool.connect();
      console.log('Database connection established successfully');
      
      // Split the query into individual statements
      const statements = text.split(';').filter(stmt => stmt.trim());
      let finalResult: QueryResult<any> = {
        rows: [],
        rowCount: 0,
        fields: [],
        command: '',
        oid: 0
      };

      // Execute each statement
      for (const stmt of statements) {
        if (!stmt.trim()) continue;
        
        console.log('Executing statement:', {
          text: stmt.trim().split('\n')[0], // Log just the first line
          attempt: i + 1,
          timestamp: new Date().toISOString()
        });

        try {
          const result = await client.query<any>(stmt, params);
          finalResult = result; // Keep the last result
          console.log('Statement executed successfully');
        } catch (error) {
          console.error('Error executing statement:', error);
          throw error;
        }
      }
      
      return finalResult;
    } catch (error) {
      lastError = error;
      console.error(`Database query error (attempt ${i + 1}):`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('connection')) {
          if (i < retries - 1) {
            const delay = (i + 1) * 1000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error('Database connection failed after multiple attempts. Please try again later.');
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
  throw lastError;
}

export async function transaction<T>(callback: (client: any) => Promise<T>) {
  let client;
  let retries = 3;
  
  while (retries > 0) {
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
      
      retries--;
      if (retries > 0 && error instanceof Error && error.message.includes('connection')) {
        const delay = (3 - retries) * 1000;
        console.log(`Retrying transaction in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
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
}

export default pool;
