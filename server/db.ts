import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import pg from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use Neon serverless driver for Neon hosted DB, standard pg for local/VPS
const isNeon = process.env.DATABASE_URL.includes('neon.tech');

export let pool: Pool | pg.Pool;
export let db: ReturnType<typeof neonDrizzle<typeof schema>> | ReturnType<typeof pgDrizzle<typeof schema>>;

if (isNeon) {
  neonConfig.webSocketConstructor = ws;
  const neonPool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool = neonPool;
  db = neonDrizzle({ client: neonPool, schema });
} else {
  const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  pool = pgPool;
  db = pgDrizzle({ client: pgPool, schema });
}
