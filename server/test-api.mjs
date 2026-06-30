import assert from "node:assert";
import { copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const TEST_PORT = Number(process.env.TEST_PORT || 4001);
const dataFile = join(tmpdir(), `ay-prayerbox-test-${Date.now()}.json`);
const serverPath = fileURLToPath(new URL("./index.mjs", import.meta.url));
const dataSource = join(fileURLToPath(new URL("./data.json", import.meta.url)));
let serverProcess;

function log(...args) {
  console.log("[api-test]", ...args);
}

async function startServer() {
  await copyFile(dataSource, dataFile);

  serverProcess = spawn(
    process.execPath,
    [serverPath],
    {
      env: { ...process.env, PORT: String(TEST_PORT), DATA_FILE: dataFile },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  serverProcess.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  serverProcess.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

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
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    await setTimeout(200);
  }
  try {
    await rm(dataFile);
  } catch {
    // ignore cleanup errors
  }
}

async function request(path, options = {}) {
  const url = `http://localhost:${TEST_PORT}${path}`;
  const response = await fetch(url, options);
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
  assert.strictEqual(createPrayer.json.approved, false);
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

  log("All backend API tests passed.");
}

try {
  await runTests();
  process.exit(0);
} catch (error) {
  console.error("Test failed:", error);
  process.exitCode = 1;
} finally {
  await stopServer();
}
