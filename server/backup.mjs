import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readdir, unlink } from "node:fs/promises";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbFile = process.env.DB_FILE
  ? isAbsolute(process.env.DB_FILE)
    ? process.env.DB_FILE
    : join(__dirname, process.env.DB_FILE)
  : join(__dirname, "data.sqlite");
const backupDir = process.env.BACKUP_DIR
  ? isAbsolute(process.env.BACKUP_DIR)
    ? process.env.BACKUP_DIR
    : join(__dirname, process.env.BACKUP_DIR)
  : join(__dirname, "backups");
const backupRetentionCount = Number(process.env.BACKUP_RETENTION_COUNT || 14);

async function run() {
  const db = new Database(dbFile, { readonly: true });
  await mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = join(backupDir, `ay-prayerbox-${timestamp}.sqlite`);
  await db.backup(backupFile);
  db.close();

  const files = (await readdir(backupDir))
    .filter((name) => name.endsWith(".sqlite"))
    .sort();

  if (files.length > backupRetentionCount) {
    const removals = files.slice(0, files.length - backupRetentionCount);
    await Promise.all(removals.map((name) => unlink(join(backupDir, name))));
  }

  console.log(`Backup created: ${backupFile}`);
}

run().catch((error) => {
  console.error("Backup failed:", error);
  process.exitCode = 1;
});
