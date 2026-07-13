import assert from "node:assert";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const TEST_PORT = Number(process.env.TEST_PORT || 4001);
const dbFile = join(tmpdir(), `ay-prayerbox-test-${Date.now()}.sqlite`);
const serverPath = fileURLToPath(new URL("./index.mjs", import.meta.url));
const dataSource = join(fileURLToPath(new URL("./data.json", import.meta.url)));
const testEmail = `test-${Date.now()}@example.com`;
const secondUserEmail = `self-service-${Date.now()}@example.com`;
let authToken = "";
let refreshToken = "";
let serverProcess;

function log(...args) {
  console.log("[api-test]", ...args);
}

async function startServer() {
  serverProcess = spawn(
    process.execPath,
    [serverPath],
    {
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(TEST_PORT),
        DB_FILE: dbFile,
        DATA_FILE: dataSource,
        ADMIN_EMAILS: testEmail,
        SESSION_SECRET: "test-session-secret",
      },
      stdio: "inherit",
    }
  );

  for (let attempt = 0; attempt < 25; attempt += 1) {
    try {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/health`);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await setTimeout(200);
  }

  throw new Error("Backend failed to start in time");
}

async function stopServer() {
  if (serverProcess && serverProcess.exitCode === null && !serverProcess.killed) {
    try {
      await request("/api/__test/shutdown", { method: "POST" });
      await Promise.race([
        new Promise((resolve) => {
          serverProcess.once("close", () => resolve());
        }),
        setTimeout(1500),
      ]);
    } catch {
      // fallback to process signal if endpoint is unavailable
    }

    if (serverProcess.exitCode === null && !serverProcess.killed) {
      serverProcess.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => {
          serverProcess.once("close", () => resolve());
        }),
        setTimeout(1500),
      ]);
    }
  }
  try {
    await rm(dbFile, { force: true });
    await rm(`${dbFile}-wal`, { force: true });
    await rm(`${dbFile}-shm`, { force: true });
  } catch {
    // ignore cleanup errors
  }
}

async function request(path, options = {}) {
  const url = `http://localhost:${TEST_PORT}${path}`;
  const headers = { ...(options.headers || {}) };
  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const response = await fetch(url, { ...options, headers });
  const body = await response.text();
  let json;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    throw new Error(`Invalid JSON response from ${path}: ${body}`);
  }
  return { response, body, json };
}

async function runTests() {
  log("Starting backend for tests on port", TEST_PORT);
  await startServer();

  const health = await request("/api/health");
  assert.strictEqual(health.response.status, 200, "Expected /api/health to return 200");
  assert.deepStrictEqual(health.json, { ok: true });
  log("/api/health OK");

  const state = await request("/api/state");
  assert.strictEqual(state.response.status, 200, "Expected /api/state to return 200");
  assert.ok(Array.isArray(state.json.prayers), "Expected state.prayers array");
  assert.ok(Array.isArray(state.json.testimonies), "Expected state.testimonies array");
  log("/api/state OK");

  const registerResponse = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: testEmail, password: "secret123" }),
  });
  assert.strictEqual(registerResponse.response.status, 201, "Expected POST /api/auth/register to return 201");
  assert.strictEqual(registerResponse.json.user.email, testEmail);
  assert.ok(registerResponse.json.token, "Expected register response token");
  assert.ok(registerResponse.json.refreshToken, "Expected register response refreshToken");
  authToken = registerResponse.json.token;
  refreshToken = registerResponse.json.refreshToken;
  log("POST /api/auth/register OK");

  const loginResponse = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "secret123" }),
  });
  assert.strictEqual(loginResponse.response.status, 200, "Expected POST /api/auth/login to return 200");
  assert.strictEqual(loginResponse.json.user.email, testEmail);
  assert.strictEqual(loginResponse.json.user.role, "admin", "Expected admin role from ADMIN_EMAILS");
  assert.ok(loginResponse.json.token, "Expected login response token");
  assert.ok(loginResponse.json.refreshToken, "Expected login response refreshToken");
  authToken = loginResponse.json.token;
  refreshToken = loginResponse.json.refreshToken;
  log("POST /api/auth/login OK");

  const refreshResponse = await request("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  assert.strictEqual(refreshResponse.response.status, 200, "Expected POST /api/auth/refresh to return 200");
  assert.ok(refreshResponse.json.token, "Expected refreshed access token");
  assert.ok(refreshResponse.json.refreshToken, "Expected refreshed refresh token");
  authToken = refreshResponse.json.token;
  refreshToken = refreshResponse.json.refreshToken;
  log("POST /api/auth/refresh OK");

  const meResponse = await request("/api/auth/me");
  assert.strictEqual(meResponse.response.status, 200, "Expected GET /api/auth/me to return 200");
  assert.strictEqual(meResponse.json.user.email, testEmail);
  log("GET /api/auth/me OK");

  const logoutResponse = await request("/api/auth/logout", { method: "POST" });
  assert.strictEqual(logoutResponse.response.status, 200, "Expected POST /api/auth/logout to return 200");
  log("POST /api/auth/logout OK");

  const postLogoutMeResponse = await request("/api/auth/me");
  assert.strictEqual(postLogoutMeResponse.response.status, 401, "Expected GET /api/auth/me to return 401 after logout");
  log("GET /api/auth/me (post-logout) OK");

  const reloginResponse = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "secret123" }),
  });
  assert.strictEqual(reloginResponse.response.status, 200, "Expected re-login to return 200");
  authToken = reloginResponse.json.token;
  refreshToken = reloginResponse.json.refreshToken;
  log("POST /api/auth/login (relogin) OK");

  const secondSessionLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "secret123" }),
  });
  assert.strictEqual(secondSessionLogin.response.status, 200, "Expected second session login to return 200");
  authToken = secondSessionLogin.json.token;
  refreshToken = secondSessionLogin.json.refreshToken;
  log("POST /api/auth/login (second session) OK");

  const sessionsResponse = await request("/api/auth/sessions");
  assert.strictEqual(sessionsResponse.response.status, 200, "Expected GET /api/auth/sessions to return 200");
  assert.ok(Array.isArray(sessionsResponse.json.sessions), "Expected sessions array");
  assert.ok(sessionsResponse.json.sessions.length >= 2, "Expected at least two sessions");
  const currentSessions = sessionsResponse.json.sessions.filter((session) => session.current);
  assert.strictEqual(currentSessions.length, 1, "Expected exactly one current session");
  const nonCurrentSession = sessionsResponse.json.sessions.find((session) => !session.current);
  assert.ok(nonCurrentSession, "Expected a non-current session");
  log("GET /api/auth/sessions OK");

  const revokeSessionResponse = await request(`/api/auth/sessions/${nonCurrentSession.id}`, { method: "DELETE" });
  assert.strictEqual(revokeSessionResponse.response.status, 200, "Expected DELETE /api/auth/sessions/:id to return 200");
  log("DELETE /api/auth/sessions/:id OK");

  const sessionsAfterRevoke = await request("/api/auth/sessions");
  assert.strictEqual(sessionsAfterRevoke.response.status, 200, "Expected GET /api/auth/sessions after revoke to return 200");
  const revokedSession = sessionsAfterRevoke.json.sessions.find((session) => session.id === nonCurrentSession.id);
  assert.ok(revokedSession && revokedSession.revokedAt, "Expected revoked session to have revokedAt");
  log("GET /api/auth/sessions (after revoke) OK");

  const logoutAllExceptCurrent = await request("/api/auth/logout-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ includeCurrent: false }),
  });
  assert.strictEqual(logoutAllExceptCurrent.response.status, 200, "Expected POST /api/auth/logout-all includeCurrent=false to return 200");
  const meAfterLogoutOthers = await request("/api/auth/me");
  assert.strictEqual(meAfterLogoutOthers.response.status, 200, "Expected current session to remain valid after includeCurrent=false");
  log("POST /api/auth/logout-all (exclude current) OK");

  const logoutAllIncludingCurrent = await request("/api/auth/logout-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ includeCurrent: true }),
  });
  assert.strictEqual(logoutAllIncludingCurrent.response.status, 200, "Expected POST /api/auth/logout-all includeCurrent=true to return 200");
  const meAfterLogoutAll = await request("/api/auth/me");
  assert.strictEqual(meAfterLogoutAll.response.status, 401, "Expected current session to be revoked after includeCurrent=true");
  log("POST /api/auth/logout-all (include current) OK");

  const reloginAfterLogoutAll = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "secret123" }),
  });
  assert.strictEqual(reloginAfterLogoutAll.response.status, 200, "Expected login after logout-all to return 200");
  authToken = reloginAfterLogoutAll.json.token;
  refreshToken = reloginAfterLogoutAll.json.refreshToken;
  log("POST /api/auth/login (after logout-all) OK");

  const profileUpdateResponse = await request("/api/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User Updated",
      username: "test_user_updated",
      phone: "+263771234567",
      bio: "Updated through API tests",
      avatar: "https://example.com/avatar.png",
    }),
  });
  assert.strictEqual(profileUpdateResponse.response.status, 200, "Expected PATCH /api/auth/profile to return 200");
  assert.strictEqual(profileUpdateResponse.json.user.name, "Test User Updated");
  assert.strictEqual(profileUpdateResponse.json.user.username, "test_user_updated");
  log("PATCH /api/auth/profile OK");

  const changePasswordResponse = await request("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "secret123", newPassword: "secret1234" }),
  });
  assert.strictEqual(changePasswordResponse.response.status, 200, "Expected POST /api/auth/change-password to return 200");
  log("POST /api/auth/change-password OK");

  const reloginWithNewPassword = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "secret1234" }),
  });
  assert.strictEqual(reloginWithNewPassword.response.status, 200, "Expected login with new password to return 200");
  authToken = reloginWithNewPassword.json.token;
  refreshToken = reloginWithNewPassword.json.refreshToken;
  log("POST /api/auth/login (new password) OK");

  const prayers = await request("/api/prayers");
  assert.strictEqual(prayers.response.status, 200, "Expected /api/prayers to return 200");
  assert.ok(Array.isArray(prayers.json), "Expected /api/prayers array");
  log("GET /api/prayers OK");

  const testimonies = await request("/api/testimonies");
  assert.strictEqual(testimonies.response.status, 200, "Expected /api/testimonies to return 200");
  assert.ok(Array.isArray(testimonies.json), "Expected /api/testimonies array");
  log("GET /api/testimonies OK");

  const newPrayer = {
    name: "Test User",
    request: "Please pray for the API test.",
    category: "Personal",
  };
  const createPrayer = await request("/api/prayers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newPrayer),
  });
  assert.strictEqual(createPrayer.response.status, 201, "Expected POST /api/prayers to return 201");
  assert.strictEqual(createPrayer.json.name, newPrayer.name);
  assert.strictEqual(createPrayer.json.approved, true, "New prayers should be posted immediately");
  const prayerId = createPrayer.json.id;
  log("POST /api/prayers OK");

  const prayResponse = await request(`/api/prayers/${prayerId}/pray`, { method: "POST" });
  assert.strictEqual(prayResponse.response.status, 200, "Expected POST /api/prayers/:id/pray to return 200");
  assert.strictEqual(prayResponse.json.prayerCount, 1, "Expected prayer count to increment");
  log("POST /api/prayers/:id/pray OK");

  const patchPrayer = await request(`/api/prayers/${prayerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved: true, urgent: true }),
  });
  assert.strictEqual(patchPrayer.response.status, 200, "Expected PATCH /api/prayers/:id to return 200");
  assert.strictEqual(patchPrayer.json.approved, true);
  assert.strictEqual(patchPrayer.json.urgent, true);
  log("PATCH /api/prayers/:id OK");

  const deletePrayer = await request(`/api/prayers/${prayerId}`, { method: "DELETE" });
  assert.strictEqual(deletePrayer.response.status, 200, "Expected DELETE /api/prayers/:id to return 200");
  assert.strictEqual(deletePrayer.json.ok, true);
  log("DELETE /api/prayers/:id OK");

  const newTestimony = { name: "Test User", text: "This is a test testimony." };
  const createTestimony = await request("/api/testimonies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newTestimony),
  });
  assert.strictEqual(createTestimony.response.status, 201, "Expected POST /api/testimonies to return 201");
  assert.strictEqual(createTestimony.json.approved, true, "New testimonies should be posted immediately");
  const testimonyId = createTestimony.json.id;
  log("POST /api/testimonies OK");

  const patchTestimony = await request(`/api/testimonies/${testimonyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved: true }),
  });
  assert.strictEqual(patchTestimony.response.status, 200, "Expected PATCH /api/testimonies/:id to return 200");
  assert.strictEqual(patchTestimony.json.approved, true);
  log("PATCH /api/testimonies/:id OK");

  const deleteTestimony = await request(`/api/testimonies/${testimonyId}`, { method: "DELETE" });
  assert.strictEqual(deleteTestimony.response.status, 200, "Expected DELETE /api/testimonies/:id to return 200");
  assert.strictEqual(deleteTestimony.json.ok, true);
  log("DELETE /api/testimonies/:id OK");

  const auditResponse = await request("/api/admin/audit-logs?limit=10");
  assert.strictEqual(auditResponse.response.status, 200, "Expected GET /api/admin/audit-logs to return 200");
  assert.ok(Array.isArray(auditResponse.json), "Expected audit logs array");
  assert.ok(auditResponse.json.length > 0, "Expected at least one audit log entry");
  log("GET /api/admin/audit-logs OK");

  const selfUserRegister = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Self Service User", email: secondUserEmail, password: "secret5678" }),
  });
  assert.strictEqual(selfUserRegister.response.status, 201, "Expected second user register to return 201");
  authToken = selfUserRegister.json.token;
  refreshToken = selfUserRegister.json.refreshToken;
  log("POST /api/auth/register (self-service user) OK");

  const requestDeleteToken = await request("/api/auth/account-actions/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete" }),
  });
  assert.strictEqual(requestDeleteToken.response.status, 200, "Expected POST /api/auth/account-actions/request to return 200");
  assert.ok(requestDeleteToken.json.confirmationToken, "Expected confirmation token");
  log("POST /api/auth/account-actions/request OK");

  const confirmDelete = await request("/api/auth/account-actions/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", confirmationToken: requestDeleteToken.json.confirmationToken }),
  });
  assert.strictEqual(confirmDelete.response.status, 200, "Expected POST /api/auth/account-actions/confirm delete to return 200");
  assert.strictEqual(confirmDelete.json.deleted, true, "Expected deleted=true");
  log("POST /api/auth/account-actions/confirm (delete) OK");

  const deletedUserMe = await request("/api/auth/me");
  assert.strictEqual(deletedUserMe.response.status, 401, "Expected GET /api/auth/me to return 401 after account delete");
  log("GET /api/auth/me (post-delete) OK");

  log("All backend API tests passed.");
}

try {
  await runTests();
  process.exitCode = 0;
} catch (error) {
  console.error("Test failed:", error);
  process.exitCode = 1;
} finally {
  await stopServer();
}
