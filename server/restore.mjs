import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbFile = process.env.DB_FILE
  ? isAbsolute(process.env.DB_FILE)
    ? process.env.DB_FILE
    : join(__dirname, process.env.DB_FILE)
  : join(__dirname, "data.sqlite");
const backupFile = process.env.BACKUP_FILE
  ? isAbsolute(process.env.BACKUP_FILE)
    ? process.env.BACKUP_FILE
    : join(__dirname, process.env.BACKUP_FILE)
  : "";

async function run() {
  if (!backupFile) {
    throw new Error("BACKUP_FILE is required for restore");
  }

  await copyFile(backupFile, dbFile);
  console.log(`Database restored from ${backupFile} to ${dbFile}`);
}

run().catch((error) => {
  console.error("Restore failed:", error);
  process.exitCode = 1;
});
