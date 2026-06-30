import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataFile = join(__dirname, "data.json");
const port = Number(process.env.PORT || 4000);

const categories = new Set(["Personal", "Health", "Family", "Studies", "Ministry", "Other"]);

const initialData = {
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

async function readData() {
  try {
    return JSON.parse(await readFile(dataFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeData(initialData);
    return structuredClone(initialData);
  }
}

async function writeData(data) {
  await writeFile(dataFile, `${JSON.stringify(data, null, 2)}\n`);
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  sendJson(res, 404, { error: "Route not found" });
}

function sanitizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 20_000) throw new Error("Request body too large");
  }
  return body ? JSON.parse(body) : {};
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

  if (method === "GET" && path === "/") {
    sendJson(res, 200, {
      ok: true,
      name: "AY Prayerbox API",
      endpoints: ["/api/health", "/api/state"]
    });
    return;
  }

  const data = await readData();

  if (method === "GET" && path === "/api/state") {
    sendJson(res, 200, data);
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

    const prayer = { id: nextId(data.prayers), name, request, category, prayerCount: 0, approved: false };
    data.prayers.push(prayer);
    await writeData(data);
    sendJson(res, 201, prayer);
    return;
  }

  const prayerMatch = path.match(/^\/api\/prayers\/(\d+)(\/pray)?$/);
  if (prayerMatch) {
    const id = Number(prayerMatch[1]);
    const prayer = data.prayers.find((item) => item.id === id);
    if (!prayer) {
      sendJson(res, 404, { error: "Prayer not found" });
      return;
    }

    if (method === "POST" && prayerMatch[2] === "/pray") {
      prayer.prayerCount += 1;
      await writeData(data);
      sendJson(res, 200, prayer);
      return;
    }

    if (method === "PATCH" && !prayerMatch[2]) {
      const body = await readBody(req);
      if (typeof body.approved === "boolean") prayer.approved = body.approved;
      if (typeof body.urgent === "boolean") prayer.urgent = body.urgent;
      await writeData(data);
      sendJson(res, 200, prayer);
      return;
    }

    if (method === "DELETE" && !prayerMatch[2]) {
      data.prayers = data.prayers.filter((item) => item.id !== id);
      await writeData(data);
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

    const testimony = {
      id: nextId(data.testimonies),
      name,
      text,
      category: "Personal",
      daysAgo: 0,
      prayerCount: 0,
      approved: false
    };
    data.testimonies.push(testimony);
    await writeData(data);
    sendJson(res, 201, testimony);
    return;
  }

  const testimonyMatch = path.match(/^\/api\/testimonies\/(\d+)$/);
  if (testimonyMatch) {
    const id = Number(testimonyMatch[1]);
    const testimony = data.testimonies.find((item) => item.id === id);
    if (!testimony) {
      sendJson(res, 404, { error: "Testimony not found" });
      return;
    }

    if (method === "PATCH") {
      const body = await readBody(req);
      if (typeof body.approved === "boolean") testimony.approved = body.approved;
      await writeData(data);
      sendJson(res, 200, testimony);
      return;
    }

    if (method === "DELETE") {
      data.testimonies = data.testimonies.filter((item) => item.id !== id);
      await writeData(data);
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  notFound(res);
}

createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error" });
  });
}).listen(port, () => {
  console.log(`AY Prayerbox API running at http://localhost:${port}`);
});
