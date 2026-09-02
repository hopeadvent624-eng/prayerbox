import { copyFile } from "node:fs/promises";
import Database from "better-sqlite3";
import pg from "pg";

const { Pool } = pg;

const PG_ROW_KEYS = {
  accountstatus: "accountStatus",
  actoruserid: "actorUserId",
  actoremail: "actorEmail",
  entitytype: "entityType",
  entityid: "entityId",
  ipaddress: "ipAddress",
  createdat: "createdAt",
  userid: "userId",
  refreshtokenhash: "refreshTokenHash",
  expiresat: "expiresAt",
  revokedat: "revokedAt",
  lastusedat: "lastUsedAt",
  useragent: "userAgent",
  tokenhash: "tokenHash",
  usedat: "usedAt",
  prayercount: "prayerCount",
  daysago: "daysAgo",
};

function normalizeArgs(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

function normalizePgRow(row) {
  if (!row) return row;
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    const nextKey = PG_ROW_KEYS[key] || key;
    normalized[nextKey] = key === "metadata" && value && typeof value === "object"
      ? JSON.stringify(value)
      : value;
  }
  return normalized;
}

function bindPostgres(sql, params) {
  if (params.length === 1 && params[0] && typeof params[0] === "object" && !Array.isArray(params[0])) {
    const values = [];
    const indexes = new Map();
    const text = sql.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_match, key) => {
      if (!indexes.has(key)) {
        indexes.set(key, values.length + 1);
        values.push(params[0][key]);
      }
      return `$${indexes.get(key)}`;
    });
    return { text, values };
  }

  const values = normalizeArgs(params);
  let index = 0;
  const text = sql.replace(/\?/g, () => `$${++index}`);
  return { text, values };
}

function withReturningId(sql) {
  const trimmed = sql.trim();
  if (!/^insert\s+/i.test(trimmed) || /\breturning\b/i.test(trimmed)) return sql;
  return `${sql} RETURNING id`;
}

class SQLiteClient {
  constructor(file) {
    this.dialect = "sqlite";
    this.file = file;
    this.db = new Database(file);
  }

  prepare(sql) {
    const statement = this.db.prepare(sql);
    return {
      all: (...params) => statement.all(...normalizeArgs(params)),
      get: (...params) => statement.get(...normalizeArgs(params)),
      run: (...params) => statement.run(...normalizeArgs(params)),
    };
  }

  async all(sql, ...params) {
    return this.db.prepare(sql).all(...normalizeArgs(params));
  }

  async get(sql, ...params) {
    return this.db.prepare(sql).get(...normalizeArgs(params));
  }

  async run(sql, ...params) {
    const result = this.db.prepare(sql).run(...normalizeArgs(params));
    return {
      ...result,
      lastInsertRowid: result.lastInsertRowid,
      lastInsertId: result.lastInsertRowid,
    };
  }

  async exec(sql) {
    return this.db.exec(sql);
  }

  async pragma(sql) {
    return this.db.pragma(sql);
  }

  async transaction(callback) {
    this.db.exec("BEGIN");
    try {
      const result = await callback();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async backup(file) {
    return this.db.backup(file);
  }

  async close() {
    this.db.close();
  }
}

class PostgresClient {
  constructor(databaseUrl) {
    this.dialect = "postgres";
    this.databaseUrl = databaseUrl;
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  prepare(sql) {
    return {
      all: (...params) => this.all(sql, ...params),
      get: (...params) => this.get(sql, ...params),
      run: (...params) => this.run(sql, ...params),
    };
  }

  async all(sql, ...params) {
    const { text, values } = bindPostgres(sql, params);
    const result = await this.pool.query(text, values);
    return result.rows.map(normalizePgRow);
  }

  async get(sql, ...params) {
    const rows = await this.all(sql, ...params);
    return rows[0];
  }

  async run(sql, ...params) {
    const { text, values } = bindPostgres(withReturningId(sql), params);
    const result = await this.pool.query(text, values);
    const id = result.rows?.[0]?.id;
    return {
      changes: result.rowCount,
      rowCount: result.rowCount,
      lastInsertRowid: id,
      lastInsertId: id,
    };
  }

  async exec(sql) {
    return this.pool.query(sql);
  }

  async pragma(sql) {
    const normalized = String(sql || "").trim().toLowerCase();
    if (normalized === "journal_mode = wal") return [];
    const tableInfo = normalized.match(/^table_info\(([^)]+)\)$/);
    if (tableInfo) {
      const table = tableInfo[1].replace(/["']/g, "");
      const result = await this.pool.query(
        `SELECT column_name AS name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );
      return result.rows.map(normalizePgRow);
    }
    return [];
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    const transactional = Object.create(this);
    transactional.pool = client;
    try {
      await client.query("BEGIN");
      const result = await callback(transactional);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async backup(file) {
    throw new Error(`Database backups are only supported for SQLite. Use pg_dump for PostgreSQL backups: ${file}`);
  }

  async close() {
    await this.pool.end();
  }
}

export async function createDbClient({ databaseUrl, dbFile }) {
  if (databaseUrl) {
    return new PostgresClient(databaseUrl);
  }
  return new SQLiteClient(dbFile);
}

export async function copySqliteDatabase(sourceFile, targetFile) {
  await copyFile(sourceFile, targetFile);
}
