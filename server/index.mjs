import { createServer } from "node:http";
import { dirname, join, isAbsolute, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, mkdir, readdir, unlink } from "node:fs/promises";
import { randomBytes, scryptSync, timingSafeEqual, createHmac, createHash } from "node:crypto";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbFile = process.env.DB_FILE
  ? isAbsolute(process.env.DB_FILE)
    ? process.env.DB_FILE
    : join(__dirname, process.env.DB_FILE)
  : join(__dirname, "data.sqlite");
const legacyDataFile = process.env.DATA_FILE
  ? isAbsolute(process.env.DATA_FILE)
    ? process.env.DATA_FILE
    : join(__dirname, process.env.DATA_FILE)
  : join(__dirname, "data.json");
const port = Number(process.env.PORT || 4000);
const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const sessionSecret = process.env.SESSION_SECRET || "dev-only-change-me";
const accessTokenTtlSeconds = Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS || 60 * 30);
const refreshTokenTtlSeconds = Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 14);
const allowedOrigins = new Set(
  String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const adminEmails = new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);
const authWindowMs = Number(process.env.AUTH_RATE_WINDOW_MS || 15 * 60 * 1000);
const authMaxAttempts = Number(process.env.AUTH_RATE_MAX_ATTEMPTS || 20);
const backupDir = process.env.BACKUP_DIR
  ? isAbsolute(process.env.BACKUP_DIR)
    ? process.env.BACKUP_DIR
    : join(__dirname, process.env.BACKUP_DIR)
  : join(__dirname, "backups");
const backupRetentionCount = Number(process.env.BACKUP_RETENTION_COUNT || 14);
const backupIntervalMinutes = Number(process.env.BACKUP_INTERVAL_MINUTES || 0);
const rateLimiter = new Map();
let backupTimer;

if (isProduction && sessionSecret === "dev-only-change-me") {
  throw new Error("SESSION_SECRET must be set in production");
}

const categories = new Set(["Personal", "Health", "Family", "Studies", "Ministry", "Other"]);
const PASSWORD_PREFIX = "scrypt";
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const TOKEN_KIND_ACCESS = "access";
const TOKEN_KIND_REFRESH = "refresh";

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function createSignedToken(payload, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const completePayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const payloadSegment = base64UrlEncode(JSON.stringify(completePayload));
  const signature = createHmac("sha256", sessionSecret).update(payloadSegment).digest("base64url");
  return `${payloadSegment}.${signature}`;
}

function verifySignedToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payloadSegment, signature] = token.split(".");
  if (!payloadSegment || !signature) return null;

  const expected = createHmac("sha256", sessionSecret).update(payloadSegment).digest("base64url");
  if (signature.length !== expected.length) return null;
  const signatureOk = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!signatureOk) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadSegment));
    if (!payload || typeof payload !== "object") return null;
    if (!payload.exp || Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashToken(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function issueAccessToken(user, sessionId) {
  return createSignedToken(
    {
      typ: TOKEN_KIND_ACCESS,
      sid: String(sessionId),
      sub: Number(user.id),
      email: String(user.email || "").toLowerCase(),
      role: user.role === "admin" ? "admin" : "user",
    },
    accessTokenTtlSeconds
  );
}

function issueRefreshToken(user, sessionId) {
  return createSignedToken(
    {
      typ: TOKEN_KIND_REFRESH,
      sid: String(sessionId),
      sub: Number(user.id),
      email: String(user.email || "").toLowerCase(),
      role: user.role === "admin" ? "admin" : "user",
    },
    refreshTokenTtlSeconds
  );
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || String(req.socket?.remoteAddress || "unknown");
}

function checkRateLimit(key, maxAttempts, windowMs) {
  const now = Date.now();
  const entry = rateLimiter.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count += 1;
  if (entry.count > maxAttempts) {
    throw new HttpError(429, "Too many requests. Please try again later.");
  }
}

function getOrigin(req) {
  return String(req.headers.origin || "").trim();
}

function getAllowedOrigin(req) {
  const origin = getOrigin(req);
  if (!origin) return "";
  if (allowedOrigins.size === 0) return origin;
  return allowedOrigins.has(origin) ? origin : "";
}

function applyResponseHeaders(req, res) {
  const origin = getAllowedOrigin(req);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()" );
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

function roleForEmail(email) {
  return adminEmails.has(String(email || "").toLowerCase()) ? "admin" : "user";
}

function buildSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    avatar: user.avatar || "",
    role: user.role === "admin" ? "admin" : "user",
    createdAt: user.createdAt,
  };
}

function getSessionById(sessionId) {
  return db
    .prepare("SELECT id, userId, refreshTokenHash, expiresAt, revokedAt FROM auth_sessions WHERE id = ?")
    .get(String(sessionId));
}

function getAuthContext(req) {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  const payload = verifySignedToken(token);
  if (!payload || payload.typ !== TOKEN_KIND_ACCESS || !payload.sid) return null;

  const session = getSessionById(payload.sid);
  if (!session) return null;
  if (session.revokedAt) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  return {
    userId: Number(payload.sub),
    email: String(payload.email || "").toLowerCase(),
    role: payload.role === "admin" ? "admin" : "user",
    sessionId: String(payload.sid),
  };
}

function requireAuth(req) {
  const auth = getAuthContext(req);
  if (!auth) throw new HttpError(401, "Authentication required");
  return auth;
}

function requireAdmin(req) {
  const auth = requireAuth(req);
  if (auth.role !== "admin") throw new HttpError(403, "Admin access required");
  return auth;
}

const initialData = {
  users: [],
  prayers: [
    { id: 1, name: "Tino", request: "Praying for my O-Level results. I've worked hard and need God's grace.", category: "Studies", prayerCount: 37, approved: true },
    { id: 2, name: "Amanda", request: "My mother is having surgery next week. Please pray for her healing and the doctors.", category: "Health", prayerCount: 24, approved: true, urgent: true },
    { id: 3, name: "Tapiwa", request: "God, please provide school fees for next term. My family is struggling.", category: "Studies", prayerCount: 15, approved: true },
    { id: 4, name: "Ruvimbo", request: "Pray for my family. We are going through a very tough season financially.", category: "Family", prayerCount: 8, approved: true },
    { id: 5, name: "Blessing", request: "I need strength in my ministry. Feeling weary and wondering if I am making a difference.", category: "Ministry", prayerCount: 12, approved: true },
    { id: 6, name: "Chiedza", request: "Seeking God's direction for my future. I have two university offers and don't know which to choose.", category: "Personal", prayerCount: 0, approved: false },
    { id: 7, name: "Tendai", request: "Please pray for my friend who has lost faith.", category: "Ministry", prayerCount: 0, approved: false }
  ],
  testimonies: [
    { id: 1, name: "Blessing", text: "God answered my prayer after exams. I passed everything with distinctions!", category: "Studies", daysAgo: 4, prayerCount: 147, approved: true },
    { id: 2, name: "Amanda", text: "My mother recovered fully from surgery. The doctors said it went better than expected. God is faithful.", category: "Health", daysAgo: 12, prayerCount: 89, approved: true },
    { id: 3, name: "Tapiwa", text: "God provided school fees through a church member I had never met. Completely unexpected.", category: "Family", daysAgo: 23, prayerCount: 63, approved: true },
    { id: 4, name: "Ruvimbo", text: "Our family situation turned around. God restored what was broken.", category: "Family", daysAgo: 31, prayerCount: 42, approved: true },
    { id: 5, name: "Chiedza", text: "I prayed for peace and God gave me far more than I asked for.", category: "Personal", daysAgo: 7, prayerCount: 28, approved: true },
    { id: 6, name: "Farai", text: "My job application was accepted. Been jobless for 8 months. Never stop praying.", category: "Personal", daysAgo: 2, prayerCount: 56, approved: true },
    { id: 7, name: "Natsai", text: "Submitted for review.", category: "Ministry", daysAgo: 1, prayerCount: 0, approved: false }
  ]
};

const db = new Database(dbFile);
db.pragma("journal_mode = WAL");

function setupSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      avatar TEXT,
      password TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prayers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      request TEXT NOT NULL,
      category TEXT NOT NULL,
      prayerCount INTEGER NOT NULL DEFAULT 0,
      approved INTEGER NOT NULL DEFAULT 1,
      urgent INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS testimonies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      text TEXT NOT NULL,
      category TEXT NOT NULL,
      daysAgo INTEGER NOT NULL DEFAULT 0,
      prayerCount INTEGER NOT NULL DEFAULT 0,
      approved INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      refreshTokenHash TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      revokedAt TEXT,
      createdAt TEXT NOT NULL,
      lastUsedAt TEXT NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actorUserId INTEGER,
      actorEmail TEXT,
      action TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT,
      metadata TEXT,
      ipAddress TEXT,
      createdAt TEXT NOT NULL
    );
  `);
}

function ensureSchemaMigrations() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  if (!columns.some((column) => column.name === "role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  }
}

function rowToUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    avatar: row.avatar || "",
    role: row.role === "admin" ? "admin" : "user",
    createdAt: row.createdAt,
  };
}

function isHashedPassword(value) {
  return typeof value === "string" && value.startsWith(`${PASSWORD_PREFIX}$`);
}

function hashPassword(password) {
  const clean = String(password || "").trim();
  const salt = randomBytes(16);
  const hash = scryptSync(clean, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return `${PASSWORD_PREFIX}$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function verifyPassword(password, storedPassword) {
  if (!isHashedPassword(storedPassword)) {
    return String(password || "") === String(storedPassword || "");
  }

  try {
    const [prefix, nRaw, rRaw, pRaw, saltRaw, hashRaw] = storedPassword.split("$");
    if (!prefix || !nRaw || !rRaw || !pRaw || !saltRaw || !hashRaw) return false;

    const n = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    const salt = Buffer.from(saltRaw, "base64");
    const expectedHash = Buffer.from(hashRaw, "base64");
    const candidateHash = scryptSync(String(password || ""), salt, expectedHash.length, {
      N: n,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });

    return candidateHash.length === expectedHash.length && timingSafeEqual(candidateHash, expectedHash);
  } catch {
    return false;
  }
}

function rowToPrayer(row) {
  return {
    id: row.id,
    name: row.name,
    request: row.request,
    category: row.category,
    prayerCount: Number(row.prayerCount || 0),
    approved: Boolean(row.approved),
    ...(row.urgent ? { urgent: true } : {}),
  };
}

function rowToTestimony(row) {
  return {
    id: row.id,
    name: row.name,
    text: row.text,
    category: row.category,
    daysAgo: Number(row.daysAgo || 0),
    prayerCount: Number(row.prayerCount || 0),
    approved: Boolean(row.approved),
  };
}

function getState() {
  return {
    users: db.prepare("SELECT * FROM users ORDER BY id").all().map(rowToUser),
    prayers: db.prepare("SELECT * FROM prayers ORDER BY id").all().map(rowToPrayer),
    testimonies: db.prepare("SELECT * FROM testimonies ORDER BY id").all().map(rowToTestimony),
  };
}

function seedIfEmpty(data) {
  const hasUsers = db.prepare("SELECT COUNT(1) AS count FROM users").get().count > 0;
  const hasPrayers = db.prepare("SELECT COUNT(1) AS count FROM prayers").get().count > 0;
  const hasTestimonies = db.prepare("SELECT COUNT(1) AS count FROM testimonies").get().count > 0;

  const insertUser = db.prepare(
    "INSERT INTO users (id, name, email, phone, avatar, password, role, createdAt) VALUES (@id, @name, @email, @phone, @avatar, @password, @role, @createdAt)"
  );
  const insertPrayer = db.prepare(
    "INSERT INTO prayers (id, name, request, category, prayerCount, approved, urgent) VALUES (@id, @name, @request, @category, @prayerCount, @approved, @urgent)"
  );
  const insertTestimony = db.prepare(
    "INSERT INTO testimonies (id, name, text, category, daysAgo, prayerCount, approved) VALUES (@id, @name, @text, @category, @daysAgo, @prayerCount, @approved)"
  );

  const tx = db.transaction(() => {
    if (!hasUsers) {
      for (const user of data.users || []) {
        insertUser.run({
          id: Number(user.id),
          name: sanitizeText(user.name, 30),
          email: sanitizeText(user.email, 120).toLowerCase(),
          phone: sanitizeText(user.phone, 20),
          avatar: String(user.avatar || "").trim().slice(0, 5_000_000),
          password: hashPassword(String(user.password || "")),
          role: roleForEmail(user.email),
          createdAt: user.createdAt || new Date().toISOString(),
        });
      }
    }

    if (!hasPrayers) {
      for (const prayer of data.prayers || []) {
        insertPrayer.run({
          id: Number(prayer.id),
          name: sanitizeText(prayer.name, 15),
          request: sanitizeText(prayer.request, 500),
          category: categories.has(prayer.category) ? prayer.category : "Personal",
          prayerCount: Number(prayer.prayerCount || 0),
          approved: prayer.approved ? 1 : 0,
          urgent: prayer.urgent ? 1 : 0,
        });
      }
    }

    if (!hasTestimonies) {
      for (const testimony of data.testimonies || []) {
        insertTestimony.run({
          id: Number(testimony.id),
          name: sanitizeText(testimony.name, 15),
          text: sanitizeText(testimony.text, 400),
          category: categories.has(testimony.category) ? testimony.category : "Personal",
          daysAgo: Number(testimony.daysAgo || 0),
          prayerCount: Number(testimony.prayerCount || 0),
          approved: testimony.approved ? 1 : 0,
        });
      }
    }

    db.prepare("UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM users) WHERE name = 'users'").run();
    db.prepare("UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM prayers) WHERE name = 'prayers'").run();
    db.prepare("UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM testimonies) WHERE name = 'testimonies'").run();
  });

  tx();
}

function migrateLegacyPlaintextPasswords() {
  const users = db.prepare("SELECT id, password FROM users").all();
  const updateUserPassword = db.prepare("UPDATE users SET password = ? WHERE id = ?");

  const tx = db.transaction(() => {
    let migrated = 0;

    for (const user of users) {
      if (isHashedPassword(user.password)) continue;
      updateUserPassword.run(hashPassword(String(user.password || "")), Number(user.id));
      migrated += 1;
    }

    return migrated;
  });

  const migratedCount = tx();
  if (migratedCount > 0) {
    console.log(`Migrated ${migratedCount} legacy plaintext password(s) to secure hashes.`);
  }
}

function syncAdminRoles() {
  if (adminEmails.size === 0) return;

  const tx = db.transaction(() => {
    for (const email of adminEmails) {
      db.prepare("UPDATE users SET role = 'admin' WHERE lower(email) = ?").run(email);
    }
  });

  tx();
}

function purgeExpiredSessions() {
  db.prepare("DELETE FROM auth_sessions WHERE expiresAt < ?").run(new Date().toISOString());
}

function createSessionForUser(user, req) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + refreshTokenTtlSeconds * 1000);
  const sessionId = randomBytes(16).toString("hex");
  const refreshToken = issueRefreshToken(user, sessionId);
  const refreshTokenHash = hashToken(refreshToken);
  const ipAddress = getClientIp(req);
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 512);

  db.prepare(
    `INSERT INTO auth_sessions
      (id, userId, refreshTokenHash, expiresAt, revokedAt, createdAt, lastUsedAt, ipAddress, userAgent)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`
  ).run(sessionId, Number(user.id), refreshTokenHash, expiresAt.toISOString(), now.toISOString(), now.toISOString(), ipAddress, userAgent);

  return {
    sessionId,
    refreshToken,
    accessToken: issueAccessToken(user, sessionId),
  };
}

function rotateSessionRefreshToken(sessionId, user) {
  const refreshToken = issueRefreshToken(user, sessionId);
  const refreshTokenHash = hashToken(refreshToken);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + refreshTokenTtlSeconds * 1000).toISOString();

  db.prepare(
    "UPDATE auth_sessions SET refreshTokenHash = ?, lastUsedAt = ?, expiresAt = ? WHERE id = ?"
  ).run(refreshTokenHash, nowIso, expiresAt, sessionId);

  return {
    refreshToken,
    accessToken: issueAccessToken(user, sessionId),
  };
}

function revokeSession(sessionId) {
  db.prepare("UPDATE auth_sessions SET revokedAt = COALESCE(revokedAt, ?) WHERE id = ?")
    .run(new Date().toISOString(), String(sessionId));
}

function revokeSessionsForUser(userId, excludeSessionId = "") {
  const nowIso = new Date().toISOString();
  if (excludeSessionId) {
    db.prepare(
      "UPDATE auth_sessions SET revokedAt = COALESCE(revokedAt, ?) WHERE userId = ? AND id <> ?"
    ).run(nowIso, Number(userId), String(excludeSessionId));
    return;
  }

  db.prepare(
    "UPDATE auth_sessions SET revokedAt = COALESCE(revokedAt, ?) WHERE userId = ?"
  ).run(nowIso, Number(userId));
}

function listSessionsForUser(userId, currentSessionId) {
  const rows = db.prepare(
    `SELECT id, createdAt, lastUsedAt, expiresAt, revokedAt, ipAddress, userAgent
     FROM auth_sessions
     WHERE userId = ?
     ORDER BY createdAt DESC`
  ).all(Number(userId));

  return rows.map((item) => ({
    id: item.id,
    current: item.id === currentSessionId,
    createdAt: item.createdAt,
    lastUsedAt: item.lastUsedAt,
    expiresAt: item.expiresAt,
    revokedAt: item.revokedAt || null,
    ipAddress: item.ipAddress || "",
    userAgent: item.userAgent || "",
  }));
}

function writeAuditLog(req, auth, action, entityType, entityId, metadata = {}) {
  db.prepare(
    `INSERT INTO audit_logs
      (actorUserId, actorEmail, action, entityType, entityId, metadata, ipAddress, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    auth ? Number(auth.userId) : null,
    auth ? String(auth.email || "") : null,
    String(action),
    String(entityType),
    entityId == null ? null : String(entityId),
    JSON.stringify(metadata || {}),
    getClientIp(req),
    new Date().toISOString()
  );
}

async function writeBackup() {
  await mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = join(backupDir, `ay-prayerbox-${timestamp}.sqlite`);
  await db.backup(backupFile);

  const files = (await readdir(backupDir))
    .filter((name) => name.endsWith(".sqlite"))
    .sort();

  if (files.length > backupRetentionCount) {
    const removals = files.slice(0, files.length - backupRetentionCount);
    await Promise.all(removals.map((name) => unlink(join(backupDir, name))));
  }

  return backupFile;
}

function scheduleBackupsIfEnabled() {
  if (!backupIntervalMinutes || backupIntervalMinutes <= 0) return;
  backupTimer = setInterval(() => {
    writeBackup().catch((error) => {
      console.error("Backup failed:", error);
    });
  }, backupIntervalMinutes * 60 * 1000);
  console.log(`Automatic backups enabled every ${backupIntervalMinutes} minute(s).`);
}

async function migrateLegacyJson() {
  try {
    const content = await readFile(legacyDataFile, "utf8");
    const data = JSON.parse(content);
    if (!data || typeof data !== "object") {
      seedIfEmpty(initialData);
      return;
    }
    seedIfEmpty({
      users: Array.isArray(data.users) ? data.users : initialData.users,
      prayers: Array.isArray(data.prayers) ? data.prayers : initialData.prayers,
      testimonies: Array.isArray(data.testimonies) ? data.testimonies : initialData.testimonies,
    });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      seedIfEmpty(initialData);
      return;
    }
    throw error;
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  sendJson(res, 404, { error: "Route not found" });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sanitizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2_000_000) throw new HttpError(413, "Request body too large");
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

async function handleRequest(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || "GET";

  if (method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (method === "GET" && path === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (method === "POST" && path === "/api/__test/shutdown" && process.env.NODE_ENV === "test") {
    sendJson(res, 200, { ok: true });
    setImmediate(() => shutdown("TEST_SHUTDOWN"));
    return;
  }

  if (method === "GET" && path === "/") {
    sendJson(res, 200, {
      ok: true,
      name: "AY Prayerbox API",
      endpoints: ["/api/health", "/api/state"],
    });
    return;
  }

  if (method === "GET" && path === "/api/state") {
    const auth = getAuthContext(req);
    const state = getState();
    if (!auth || auth.role !== "admin") {
      state.users = [];
    }
    sendJson(res, 200, state);
    return;
  }

  if (method === "GET" && path === "/api/users") {
    requireAdmin(req);
    sendJson(res, 200, db.prepare("SELECT id, name, email, phone, avatar, role, createdAt FROM users ORDER BY id").all().map(rowToUser));
    return;
  }

  if (method === "GET" && path === "/api/admin/audit-logs") {
    requireAdmin(req);
    const limitRaw = Number(url.searchParams.get("limit") || 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 100;
    const logs = db.prepare(
      "SELECT id, actorUserId, actorEmail, action, entityType, entityId, metadata, ipAddress, createdAt FROM audit_logs ORDER BY id DESC LIMIT ?"
    ).all(limit);
    sendJson(res, 200, logs.map((item) => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : {},
    })));
    return;
  }

  if (method === "POST" && path === "/api/admin/backup") {
    const auth = requireAdmin(req);
    const backupFile = await writeBackup();
    writeAuditLog(req, auth, "backup_database", "database", basename(backupFile));
    sendJson(res, 200, { ok: true, backupFile });
    return;
  }

  if (method === "GET" && path === "/api/prayers") {
    sendJson(res, 200, db.prepare("SELECT * FROM prayers ORDER BY id").all().map(rowToPrayer));
    return;
  }

  if (method === "GET" && path === "/api/testimonies") {
    sendJson(res, 200, db.prepare("SELECT * FROM testimonies ORDER BY id").all().map(rowToTestimony));
    return;
  }

  if (method === "POST" && path === "/api/auth/register") {
    checkRateLimit(`auth:register:${getClientIp(req)}`, authMaxAttempts, authWindowMs);
    const body = await readBody(req);
    const name = sanitizeText(body.name, 30);
    const email = sanitizeText(body.email, 120).toLowerCase();
    const password = String(body.password || "").trim();
    const phone = sanitizeText(body.phone, 20);
    const avatar = String(body.avatar || "").trim().slice(0, 5_000_000);

    if (!name || !email || !password) {
      sendJson(res, 400, { error: "Name, email, and password are required" });
      return;
    }

    const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existingUser) {
      sendJson(res, 409, { error: "An account with that email already exists" });
      return;
    }

    const createdAt = new Date().toISOString();
    const role = roleForEmail(email);
    const passwordHash = hashPassword(password);
    const result = db
      .prepare("INSERT INTO users (name, email, phone, avatar, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(name, email, phone, avatar, passwordHash, role, createdAt);

    const user = {
      id: Number(result.lastInsertRowid),
      name,
      email,
      phone,
      avatar,
      role,
      createdAt,
    };

    const session = createSessionForUser(user, req);

    sendJson(res, 201, {
      user,
      token: session.accessToken,
      refreshToken: session.refreshToken,
    });
    return;
  }

  if (method === "POST" && path === "/api/auth/login") {
    checkRateLimit(`auth:login:${getClientIp(req)}`, authMaxAttempts, authWindowMs);
    const body = await readBody(req);
    const email = sanitizeText(body.email, 120).toLowerCase();
    const password = String(body.password || "").trim();
    const user = db
      .prepare("SELECT id, name, email, phone, avatar, role, password, createdAt FROM users WHERE email = ?")
      .get(email);

    if (!user || !verifyPassword(password, user.password)) {
      sendJson(res, 401, { error: "Invalid email or password" });
      return;
    }

    if (!isHashedPassword(user.password)) {
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashPassword(password), Number(user.id));
    }

    const safeUser = buildSafeUser(user);
    const session = createSessionForUser(safeUser, req);
    sendJson(res, 200, { user: safeUser, token: session.accessToken, refreshToken: session.refreshToken });
    return;
  }

  if (method === "POST" && path === "/api/auth/refresh") {
    checkRateLimit(`auth:refresh:${getClientIp(req)}`, authMaxAttempts * 2, authWindowMs);
    const body = await readBody(req);
    const refreshToken = String(body.refreshToken || "").trim();
    const payload = verifySignedToken(refreshToken);
    if (!payload || payload.typ !== TOKEN_KIND_REFRESH || !payload.sid) {
      sendJson(res, 401, { error: "Invalid refresh token" });
      return;
    }

    const session = getSessionById(payload.sid);
    if (!session || session.revokedAt) {
      sendJson(res, 401, { error: "Session has been revoked" });
      return;
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      revokeSession(payload.sid);
      sendJson(res, 401, { error: "Session has expired" });
      return;
    }

    if (hashToken(refreshToken) !== session.refreshTokenHash) {
      revokeSession(payload.sid);
      sendJson(res, 401, { error: "Refresh token mismatch" });
      return;
    }

    const user = db.prepare("SELECT id, name, email, phone, avatar, role, createdAt FROM users WHERE id = ?").get(Number(payload.sub));
    if (!user) {
      revokeSession(payload.sid);
      sendJson(res, 401, { error: "User no longer exists" });
      return;
    }

    const safeUser = buildSafeUser(user);
    const next = rotateSessionRefreshToken(payload.sid, safeUser);
    sendJson(res, 200, { user: safeUser, token: next.accessToken, refreshToken: next.refreshToken });
    return;
  }

  if (method === "POST" && path === "/api/auth/logout") {
    const auth = requireAuth(req);
    revokeSession(auth.sessionId);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (method === "POST" && path === "/api/auth/logout-all") {
    const auth = requireAuth(req);
    const body = await readBody(req);
    const includeCurrent = Boolean(body.includeCurrent);

    if (includeCurrent) {
      revokeSessionsForUser(auth.userId);
    } else {
      revokeSessionsForUser(auth.userId, auth.sessionId);
    }

    writeAuditLog(req, auth, "logout_all_sessions", "session", auth.sessionId, {
      includeCurrent,
    });
    sendJson(res, 200, { ok: true });
    return;
  }

  if (method === "GET" && path === "/api/auth/sessions") {
    const auth = requireAuth(req);
    sendJson(res, 200, {
      sessions: listSessionsForUser(auth.userId, auth.sessionId),
    });
    return;
  }

  const authSessionMatch = path.match(/^\/api\/auth\/sessions\/([a-fA-F0-9]+)$/);
  if (authSessionMatch && method === "DELETE") {
    const auth = requireAuth(req);
    const targetSessionId = String(authSessionMatch[1]);
    const target = db.prepare("SELECT id, userId, revokedAt FROM auth_sessions WHERE id = ?").get(targetSessionId);

    if (!target) {
      sendJson(res, 404, { error: "Session not found" });
      return;
    }

    if (auth.role !== "admin" && Number(target.userId) !== Number(auth.userId)) {
      sendJson(res, 403, { error: "Not allowed to revoke this session" });
      return;
    }

    revokeSession(targetSessionId);
    writeAuditLog(req, auth, "revoke_session", "session", targetSessionId, {
      targetUserId: Number(target.userId),
      alreadyRevoked: Boolean(target.revokedAt),
    });
    sendJson(res, 200, { ok: true });
    return;
  }

  if (method === "GET" && path === "/api/auth/me") {
    const auth = requireAuth(req);
    const user = db
      .prepare("SELECT id, name, email, phone, avatar, role, createdAt FROM users WHERE id = ?")
      .get(auth.userId);
    if (!user) {
      sendJson(res, 401, { error: "Session is no longer valid" });
      return;
    }

    sendJson(res, 200, { user: rowToUser(user) });
    return;
  }

  if (method === "POST" && path === "/api/prayers") {
    const body = await readBody(req);
    const name = sanitizeText(body.name, 15);
    const request = sanitizeText(body.request, 500);
    const category = categories.has(body.category) ? body.category : "Personal";

    if (!name || !request) {
      sendJson(res, 400, { error: "Name and prayer request are required" });
      return;
    }

    const result = db
      .prepare("INSERT INTO prayers (name, request, category, prayerCount, approved, urgent) VALUES (?, ?, ?, 0, 1, 0)")
      .run(name, request, category);

    const prayer = db.prepare("SELECT * FROM prayers WHERE id = ?").get(Number(result.lastInsertRowid));
    sendJson(res, 201, rowToPrayer(prayer));
    return;
  }

  const userMatch = path.match(/^\/api\/users\/(\d+)$/);
  if (userMatch) {
    const auth = requireAuth(req);
    const id = Number(userMatch[1]);
    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
    if (!user) {
      sendJson(res, 404, { error: "User not found" });
      return;
    }

    if (method === "DELETE") {
      if (auth.role !== "admin" && auth.userId !== id) {
        sendJson(res, 403, { error: "Not allowed to delete this account" });
        return;
      }
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      if (auth.role === "admin") {
        writeAuditLog(req, auth, "delete_user", "user", id);
      }
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  const prayerMatch = path.match(/^\/api\/prayers\/(\d+)(\/pray)?$/);
  if (prayerMatch) {
    const id = Number(prayerMatch[1]);
    const prayer = db.prepare("SELECT * FROM prayers WHERE id = ?").get(id);

    if (!prayer) {
      sendJson(res, 404, { error: "Prayer not found" });
      return;
    }

    if (method === "POST" && prayerMatch[2] === "/pray") {
      db.prepare("UPDATE prayers SET prayerCount = prayerCount + 1 WHERE id = ?").run(id);
      const updated = db.prepare("SELECT * FROM prayers WHERE id = ?").get(id);
      sendJson(res, 200, rowToPrayer(updated));
      return;
    }

    if (method === "PATCH" && !prayerMatch[2]) {
      const auth = requireAdmin(req);
      const body = await readBody(req);
      const approved = typeof body.approved === "boolean" ? (body.approved ? 1 : 0) : prayer.approved;
      const urgent = typeof body.urgent === "boolean" ? (body.urgent ? 1 : 0) : prayer.urgent;

      db.prepare("UPDATE prayers SET approved = ?, urgent = ? WHERE id = ?").run(approved, urgent, id);
      writeAuditLog(req, auth, "update_prayer", "prayer", id, { approved: Boolean(approved), urgent: Boolean(urgent) });
      const updated = db.prepare("SELECT * FROM prayers WHERE id = ?").get(id);
      sendJson(res, 200, rowToPrayer(updated));
      return;
    }

    if (method === "DELETE" && !prayerMatch[2]) {
      const auth = requireAdmin(req);
      db.prepare("DELETE FROM prayers WHERE id = ?").run(id);
      writeAuditLog(req, auth, "delete_prayer", "prayer", id);
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  if (method === "POST" && path === "/api/testimonies") {
    const body = await readBody(req);
    const name = sanitizeText(body.name, 15);
    const text = sanitizeText(body.text, 400);

    if (!name || !text) {
      sendJson(res, 400, { error: "Name and testimony are required" });
      return;
    }

    const result = db
      .prepare("INSERT INTO testimonies (name, text, category, daysAgo, prayerCount, approved) VALUES (?, ?, 'Personal', 0, 0, 1)")
      .run(name, text);

    const testimony = db.prepare("SELECT * FROM testimonies WHERE id = ?").get(Number(result.lastInsertRowid));
    sendJson(res, 201, rowToTestimony(testimony));
    return;
  }

  const testimonyMatch = path.match(/^\/api\/testimonies\/(\d+)$/);
  if (testimonyMatch) {
    const id = Number(testimonyMatch[1]);
    const testimony = db.prepare("SELECT * FROM testimonies WHERE id = ?").get(id);

    if (!testimony) {
      sendJson(res, 404, { error: "Testimony not found" });
      return;
    }

    if (method === "PATCH") {
      const auth = requireAdmin(req);
      const body = await readBody(req);
      const approved = typeof body.approved === "boolean" ? (body.approved ? 1 : 0) : testimony.approved;
      db.prepare("UPDATE testimonies SET approved = ? WHERE id = ?").run(approved, id);
      writeAuditLog(req, auth, "update_testimony", "testimony", id, { approved: Boolean(approved) });
      const updated = db.prepare("SELECT * FROM testimonies WHERE id = ?").get(id);
      sendJson(res, 200, rowToTestimony(updated));
      return;
    }

    if (method === "DELETE") {
      const auth = requireAdmin(req);
      db.prepare("DELETE FROM testimonies WHERE id = ?").run(id);
      writeAuditLog(req, auth, "delete_testimony", "testimony", id);
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  notFound(res);
}

setupSchema();
ensureSchemaMigrations();
await migrateLegacyJson();
migrateLegacyPlaintextPasswords();
syncAdminRoles();
purgeExpiredSessions();
scheduleBackupsIfEnabled();

const server = createServer((req, res) => {
  applyResponseHeaders(req, res);
  handleRequest(req, res).catch((error) => {
    if (error instanceof HttpError) {
      sendJson(res, error.status, { error: error.message });
      return;
    }
    console.error(error);
    sendJson(res, 500, { error: "Internal server error" });
  });
}).listen(port, () => {
  console.log(`AY Prayerbox API running at http://localhost:${port}`);
  console.log(`SQLite database: ${dbFile}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down API...`);
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = undefined;
  }
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
