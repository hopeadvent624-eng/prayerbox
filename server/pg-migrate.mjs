import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/prayerbox';
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const migrationsDir = join(new URL('.', import.meta.url).pathname, 'migrations');
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    const path = join(migrationsDir, file);
    const sql = readFileSync(path, 'utf8');
    console.log('Applying migration', file);
    await client.query(sql);
  }

  await client.end();
  console.log('Migrations applied.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
