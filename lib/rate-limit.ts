import { NextApiRequest } from 'next';
import { query } from './postgresql';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const RATE_LIMITS: { [key: string]: RateLimitConfig } = {
  signup: {
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5 // 5 attempts per window
  },
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 5 // 5 attempts per window
  }
};

// Create rate_limits table if it doesn't exist
export async function initRateLimitTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        endpoint VARCHAR(50) NOT NULL,
        requests INTEGER DEFAULT 1,
        window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ip_address, endpoint)
      );
    `);

    // Create index for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint 
      ON rate_limits(ip_address, endpoint);
    `);
  } catch (error) {
    console.error('Error initializing rate limit table:', error);
    throw error;
  }
}

export async function rateLimit(req: NextApiRequest, endpoint: keyof typeof RATE_LIMITS): Promise<void> {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    throw new Error(`No rate limit configuration found for endpoint: ${endpoint}`);
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
             req.socket.remoteAddress || 
             'unknown';

  try {
    // Begin transaction
    const result = await query(`
      WITH updated AS (
        INSERT INTO rate_limits (ip_address, endpoint, requests, window_start)
        VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (ip_address, endpoint) DO UPDATE
        SET 
          requests = CASE
            WHEN rate_limits.window_start + interval '1 millisecond' * $3 < CURRENT_TIMESTAMP
            THEN 1
            ELSE rate_limits.requests + 1
          END,
          window_start = CASE
            WHEN rate_limits.window_start + interval '1 millisecond' * $3 < CURRENT_TIMESTAMP
            THEN CURRENT_TIMESTAMP
            ELSE rate_limits.window_start
          END
        WHERE rate_limits.ip_address = $1 AND rate_limits.endpoint = $2
        RETURNING requests, window_start
      )
      SELECT * FROM updated;
    `, [ip, endpoint, config.windowMs]);

    const { requests, window_start } = result.rows[0];

    // Check if rate limit exceeded
    if (requests > config.max) {
      const resetTime = new Date(window_start).getTime() + config.windowMs;
      const now = Date.now();
      const remainingTime = Math.ceil((resetTime - now) / 1000); // in seconds

      throw new Error(`Rate limit exceeded. Please try again in ${remainingTime} seconds`);
    }
  } catch (error) {
    console.error('Rate limit error:', error);
    throw error;
  }
}

// Initialize the rate limit table when the module is imported
initRateLimitTable().catch(console.error);
