// Postgres access for the web/API layer. The schema is owned by the Python
// worker's Alembic migrations (ADR 0001/0002); here we run parameterized SQL
// only — never string-interpolated queries.
import { Pool, type PoolClient, type QueryResultRow } from "pg";

// Reuse a single pool across serverless invocations.
const globalForPg = globalThis as unknown as { __geoPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg.__geoPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForPg.__geoPool = new Pool({ connectionString, max: 5 });
  }
  return globalForPg.__geoPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as unknown[]);
  return result.rows;
}

/** Run a function inside a transaction, committing on success. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
