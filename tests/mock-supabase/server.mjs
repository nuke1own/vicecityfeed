// In-memory stand-in for the Supabase REST + Auth APIs used by Social, so the
// real server actions can be exercised end to end in browser tests.
// It mirrors the ownership rules of supabase/schema.sql (which are tested
// separately against Postgres). Not used in production.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54321);

export const USERS = {
  shelbys: { id: "aaaaaaaa-0000-4000-8000-000000000001", handle: "shelbys", display_name: "shelbys", email: "shelbys@example.com" },
  lucia: { id: "bbbbbbbb-0000-4000-8000-000000000002", handle: "lucia", display_name: "Lucia", email: "lucia@example.com" },
};

let db;
let seq = 0;
const uuid = () => `cccccccc-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

function reset() {
  seq = 0;
  const now = Date.now();
  db = {
    profiles: Object.values(USERS).map((u, i) => ({
      id: u.id, handle: u.handle, display_name: u.display_name, bio: "", avatar_url: i === 0 ? "/avatars/lucia.webp" : "/avatars/cal-hampton.webp",
      role: "member", theme: null, created_at: new Date(now - 86_400_000).toISOString(),
    })),
    community_posts: [
      { id: "dddddddd-0000-4000-8000-000000000001", author_id: USERS.lucia.id, body: "Hello from Lucia #GTA6", reply_to: null, hidden: false, created_at: new Date(now - 7_200_000).toISOString() },
      { id: "dddddddd-0000-4000-8000-000000000002", author_id: USERS.shelbys.id, body: "Hi", reply_to: null, hidden: false, created_at: new Date(now - 3_600_000).toISOString() },
    ],
    post_reactions: [],
    profile_follows: [],
    post_reports: [],
  };
}
reset();

function userFromRequest(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return Object.values(USERS).find((u) => u.id === payload.sub) ?? null;
  } catch {
    return null;
  }
}

function feedRows(viewer) {
  return db.community_posts
    .filter((p) => !p.hidden)
    .map((p) => {
      const author = db.profiles.find((pr) => pr.id === p.author_id);
      return {
        id: p.id, body: p.body, created_at: p.created_at, reply_to: p.reply_to, author_id: p.author_id,
        handle: author.handle, display_name: author.display_name, avatar_url: author.avatar_url, role: author.role,
        like_count: db.post_reactions.filter((r) => r.post_id === p.id && r.reaction === "like").length,
        reply_count: db.community_posts.filter((c) => c.reply_to === p.id && !c.hidden).length,
        liked: Boolean(viewer && db.post_reactions.some((r) => r.post_id === p.id && r.reaction === "like" && r.user_id === viewer.id)),
        bookmarked: Boolean(viewer && db.post_reactions.some((r) => r.post_id === p.id && r.reaction === "bookmark" && r.user_id === viewer.id)),
      };
    });
}

function tableRows(table, viewer) {
  if (table === "post_feed") return feedRows(viewer);
  if (table === "post_reactions") return db.post_reactions.filter((r) => r.reaction !== "bookmark" || r.user_id === viewer?.id);
  if (table === "post_reports") return db.post_reports.filter((r) => r.reporter_id === viewer?.id);
  return db[table] ?? [];
}

const decode = (v) => decodeURIComponent(v);
function matches(row, column, expr) {
  const value = row[column];
  const [op, ...rest] = expr.split(".");
  const arg = rest.join(".");
  switch (op) {
    case "eq": return String(value) === decode(arg);
    case "neq": return String(value) !== decode(arg);
    case "is": return arg === "null" ? value === null || value === undefined : String(value) === arg;
    case "lt": return value < decode(arg);
    case "gt": return value > decode(arg);
    case "in": return arg.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, "")).includes(String(value));
    case "ilike": {
      const pattern = decode(arg).replace(/[.+?^${}()|[\]\\]/g, (c) => `\\${c}`).replace(/%/g, ".*").replace(/\*/g, ".*");
      return new RegExp(`^${pattern}$`, "is").test(String(value ?? ""));
    }
    case "not": return !matches(row, column, arg);
    default: return true;
  }
}

function applyFilters(rows, params) {
  let out = rows;
  for (const [key, value] of params) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(key)) continue;
    if (key === "or") {
      const parts = value.replace(/^\(|\)$/g, "").split(",");
      out = out.filter((row) => parts.some((part) => {
        const [col, ...expr] = part.split(".");
        return matches(row, col, expr.join("."));
      }));
      continue;
    }
    out = out.filter((row) => matches(row, key, value));
  }
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === "desc" ? -1 : 1));
  }
  const limit = Number(params.get("limit"));
  if (limit) out = out.slice(0, limit);
  return out;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,HEAD,OPTIONS",
    "access-control-expose-headers": "content-range",
    ...headers,
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : null); } catch { resolve(null); }
    });
  });
}

const RPC = {
  trending_hashtags: () => [],
  top_creators: () => [],
  unread_conversation_count: () => 0,
  unread_notification_count: () => 0,
  get_inbox: () => [],
  get_notifications: () => [],
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") return send(res, 204);
  if (url.pathname === "/__reset") { reset(); return send(res, 200, { ok: true }); }
  if (url.pathname === "/__state") return send(res, 200, db);

  const viewer = userFromRequest(req);

  if (url.pathname === "/auth/v1/user") {
    if (!viewer) return send(res, 401, { message: "invalid token" });
    return send(res, 200, { id: viewer.id, aud: "authenticated", role: "authenticated", email: viewer.email, app_metadata: {}, user_metadata: {}, created_at: new Date(0).toISOString() });
  }
  if (url.pathname.startsWith("/auth/v1/")) return send(res, 200, {});

  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
  if (rpc) return send(res, 200, RPC[rpc[1]] ? RPC[rpc[1]]() : null);

  const table = url.pathname.match(/^\/rest\/v1\/(\w+)$/)?.[1];
  if (!table) return send(res, 404, { message: "not found" });
  const prefer = String(req.headers.prefer || "");

  if (req.method === "GET" || req.method === "HEAD") {
    const rows = applyFilters(tableRows(table, viewer), url.searchParams);
    const range = { "content-range": rows.length ? `0-${rows.length - 1}/${rows.length}` : `*/0` };
    return req.method === "HEAD" ? send(res, 200, undefined, range) : send(res, 200, rows, range);
  }

  if (req.method === "POST") {
    if (!viewer) return send(res, 401, { message: "JWT required" });
    const body = await readBody(req);
    const rows = Array.isArray(body) ? body : [body];
    for (const row of rows) {
      if (table === "community_posts") {
        if (row.author_id !== viewer.id) return send(res, 403, { code: "42501", message: "new row violates row-level security policy" });
        if (!String(row.body || "").trim()) return send(res, 400, { code: "23514", message: "check constraint" });
        db.community_posts.push({ id: uuid(), hidden: false, reply_to: null, created_at: new Date().toISOString(), ...row });
      } else if (table === "post_reactions") {
        if (row.user_id !== viewer.id) return send(res, 403, { code: "42501", message: "rls" });
        const exists = db.post_reactions.some((r) => r.post_id === row.post_id && r.user_id === row.user_id && r.reaction === row.reaction);
        if (!exists) db.post_reactions.push({ ...row, created_at: new Date().toISOString() });
      } else if (table === "post_reports") {
        if (row.reporter_id !== viewer.id) return send(res, 403, { code: "42501", message: "rls" });
        const exists = db.post_reports.some((r) => r.post_id === row.post_id && r.reporter_id === row.reporter_id);
        if (!exists) db.post_reports.push({ ...row, id: uuid(), status: "open", created_at: new Date().toISOString() });
      } else if (table === "profile_follows") {
        if (row.follower_id !== viewer.id) return send(res, 403, { code: "42501", message: "rls" });
        const exists = db.profile_follows.some((f) => f.follower_id === row.follower_id && f.following_id === row.following_id);
        if (!exists) db.profile_follows.push({ ...row, created_at: new Date().toISOString() });
      } else {
        return send(res, 403, { message: `insert into ${table} not supported` });
      }
    }
    return send(res, 201, prefer.includes("return=representation") ? rows : undefined);
  }

  if (req.method === "DELETE") {
    if (!viewer) return send(res, 401, { message: "JWT required" });
    const owner = { community_posts: "author_id", post_reactions: "user_id", profile_follows: "follower_id" }[table];
    if (!owner) return send(res, 403, { message: "delete not supported" });
    const doomed = applyFilters(db[table], url.searchParams).filter((row) => row[owner] === viewer.id);
    db[table] = db[table].filter((row) => !doomed.includes(row));
    if (table === "community_posts") {
      const ids = new Set(doomed.map((p) => p.id));
      db.community_posts = db.community_posts.filter((p) => !ids.has(p.reply_to));
      db.post_reactions = db.post_reactions.filter((r) => !ids.has(r.post_id));
    }
    const range = { "content-range": doomed.length ? `0-${doomed.length - 1}/${doomed.length}` : "*/0" };
    return send(res, prefer.includes("return=representation") ? 200 : 204, prefer.includes("return=representation") ? doomed : undefined, range);
  }

  return send(res, 405, { message: "method not allowed" });
}).listen(PORT, "127.0.0.1", () => console.log(`mock supabase on ${PORT}`));
