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

export const CONVERSATION = "eeeeeeee-0000-4000-8000-000000000001";

let db;
// Uploaded file bytes, kept out of /__state.
let files = {};
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
    post_images: [],
    polls: [],
    poll_votes: [],
    storage: {},
    storage_cleanup: [],
    conversations: [{ id: CONVERSATION, created_at: new Date(now - 7_200_000).toISOString(), last_message_at: new Date(now - 600_000).toISOString() }],
    conversation_members: [
      { conversation_id: CONVERSATION, user_id: USERS.shelbys.id, last_read_at: new Date(now - 3_600_000).toISOString() },
      { conversation_id: CONVERSATION, user_id: USERS.lucia.id, last_read_at: new Date(now - 3_600_000).toISOString() },
    ],
    messages: [
      { id: "ffffffff-0000-4000-8000-000000000001", conversation_id: CONVERSATION, sender_id: USERS.lucia.id, body: "Did you see the new trailer?", reply_to: null, attachments: [], created_at: new Date(now - 900_000).toISOString() },
      { id: "ffffffff-0000-4000-8000-000000000002", conversation_id: CONVERSATION, sender_id: USERS.lucia.id, body: "Leonida looks unreal https://www.rockstargames.com/VI", reply_to: null, attachments: [], created_at: new Date(now - 600_000).toISOString() },
    ],
    message_reactions: [],
    blocks: [],
  };
  files = {};
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
        images: db.post_images.filter((i) => i.post_id === p.id).sort((a, b) => a.position - b.position).map(({ url, alt, width, height }) => ({ url, alt, width, height })),
        poll: (() => {
          const poll = db.polls.find((pl) => pl.post_id === p.id);
          if (!poll) return null;
          const votes = db.poll_votes.filter((v) => v.post_id === p.id);
          return {
            options: poll.options,
            endsAt: poll.ends_at,
            counts: poll.options.map((_, i) => votes.filter((v) => v.option_index === i).length),
            myVote: votes.find((v) => v.user_id === viewer?.id)?.option_index ?? null,
          };
        })(),
      };
    });
}

const blockedBetween = (a, b) => db.blocks.some((x) => (x.blocker_id === a && x.blocked_id === b) || (x.blocker_id === b && x.blocked_id === a));
const conversationBlocked = (viewer, conversationId) =>
  Boolean(viewer && db.conversation_members.some((m) => m.conversation_id === conversationId && m.user_id !== viewer.id && blockedBetween(viewer.id, m.user_id)));

const memberOf = (viewer, conversationId) =>
  Boolean(viewer && db.conversation_members.some((m) => m.conversation_id === conversationId && m.user_id === viewer.id));

function tableRows(table, viewer) {
  if (table === "post_feed") return feedRows(viewer);
  if (table === "conversations") return db.conversations.filter((c) => memberOf(viewer, c.id));
  if (table === "blocks") return db.blocks.filter((b) => b.blocker_id === viewer?.id);
  if (table === "conversation_members") return db.conversation_members.filter((m) => memberOf(viewer, m.conversation_id));
  if (table === "messages") return db.messages.filter((m) => memberOf(viewer, m.conversation_id));
  if (table === "message_reactions") {
    return db.message_reactions.filter((r) => {
      const message = db.messages.find((m) => m.id === r.message_id);
      return message && memberOf(viewer, message.conversation_id);
    });
  }
  if (table === "post_reactions") return db.post_reactions.filter((r) => r.reaction !== "bookmark" || r.user_id === viewer?.id);
  if (table === "post_reports") return db.post_reports.filter((r) => r.reporter_id === viewer?.id);
  if (table === "poll_votes") return db.poll_votes.filter((v) => v.user_id === viewer?.id);
  return db[table] ?? [];
}

// Search patterns contain a literal "%" (e.g. %luc%), which is not valid URI escaping.
const decode = (v) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};
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
      const pattern = decode(arg).replace(/[.+?^${}()|[\]\\]/g, (c) => `\\${c}`).replace(/[%*]/g, ".*");
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

function inbox(viewer) {
  if (!viewer) return [];
  return db.conversation_members
    .filter((mine) => mine.user_id === viewer.id)
    .map((mine) => {
      const conversation = db.conversations.find((c) => c.id === mine.conversation_id);
      const other = db.conversation_members.find((m) => m.conversation_id === mine.conversation_id && m.user_id !== viewer.id);
      const profile = db.profiles.find((p) => p.id === other?.user_id);
      const last = db.messages
        .filter((m) => m.conversation_id === mine.conversation_id && (!mine.cleared_at || m.created_at > mine.cleared_at))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
      if (mine.cleared_at && !last) return null;
      const body = !last ? null : last.body.trim() ? last.body : last.attachments[0]?.kind === "audio" ? "🎤 Voice message" : last.attachments.length > 1 ? `📷 ${last.attachments.length} photos` : "📷 Photo";
      return {
        conversation_id: mine.conversation_id, last_message_at: conversation.last_message_at, other_id: other.user_id,
        handle: profile.handle, display_name: profile.display_name, avatar_url: profile.avatar_url,
        last_body: body, last_sender_id: last?.sender_id ?? null,
        last_created_at: last?.created_at ?? null, other_last_read_at: other.last_read_at,
        unread: Boolean(last && last.created_at > mine.last_read_at && last.sender_id !== viewer.id),
        unread_count: db.messages.filter((m) => m.conversation_id === mine.conversation_id && m.sender_id !== viewer.id && m.created_at > mine.last_read_at).length,
        muted: Boolean(mine.muted),
        blocked: blockedBetween(viewer.id, other.user_id),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.last_message_at < b.last_message_at ? 1 : -1));
}

function queueMessageFiles(message) {
  for (const item of message.attachments ?? []) {
    if (item.path && !db.storage_cleanup.includes(`message-media:${item.path}`)) db.storage_cleanup.push(`message-media:${item.path}`);
  }
}

const RPC = {
  trending_hashtags: () => [],
  top_creators: () => [],
  unread_conversation_count: (viewer) => inbox(viewer).filter((row) => row.unread && !row.muted && !row.blocked).length,
  block_status: (viewer, body) => [{
    i_blocked: db.blocks.some((b) => b.blocker_id === viewer?.id && b.blocked_id === body?.p_other),
    blocked_me: db.blocks.some((b) => b.blocker_id === body?.p_other && b.blocked_id === viewer?.id),
  }],
  conversation_blocked: (viewer, body) => conversationBlocked(viewer, body?.p_conversation),
  unread_notification_count: () => 0,
  get_inbox: (viewer) => inbox(viewer),
  start_conversation: (viewer, body) => {
    if (blockedBetween(viewer?.id, body?.p_other)) return { __error: "blocked" };
    const found = db.conversation_members.find((a) => a.user_id === viewer?.id && db.conversation_members.some((b) => b.conversation_id === a.conversation_id && b.user_id === body?.p_other));
    if (found) return found.conversation_id;
    const id = uuid();
    const now = new Date().toISOString();
    db.conversations.push({ id, created_at: now, last_message_at: now });
    db.conversation_members.push({ conversation_id: id, user_id: viewer.id, last_read_at: now }, { conversation_id: id, user_id: body.p_other, last_read_at: now });
    return id;
  },
  list_message_media_cleanup: () => db.storage_cleanup.filter((p) => p.startsWith("message-media:")).map((p) => p.slice("message-media:".length)),
  clear_message_media_cleanup: (_viewer, body) => {
    db.storage_cleanup = db.storage_cleanup.filter((p) => !(p.startsWith("message-media:") && (body?.p_paths ?? []).includes(p.slice(14)) && !db.storage[`message-media/${p.slice(14)}`]));
    return null;
  },
  get_notifications: () => [],
  list_storage_cleanup: () => db.storage_cleanup.filter((p) => !p.startsWith("message-media:")),
  clear_storage_cleanup: () => {
    db.storage_cleanup = db.storage_cleanup.filter((path) => path.startsWith("message-media:") || db.storage[`post-images/${path}`]);
    return null;
  },
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") return send(res, 204);
  if (url.pathname === "/__reset") { reset(); return send(res, 200, { ok: true }); }
  if (url.pathname === "/__state") return send(res, 200, db);
  // Test helper: add `count` older messages to the seeded conversation.
  if (url.pathname === "/__seed_messages") {
    const count = Number(url.searchParams.get("count")) || 0;
    const start = Date.now() - 86_400_000 * 2;
    for (let i = 0; i < count; i += 1) {
      db.messages.push({
        id: `99999999-0000-4000-8000-${String(i).padStart(12, "0")}`, conversation_id: CONVERSATION,
        sender_id: i % 2 ? USERS.lucia.id : USERS.shelbys.id, body: `Old message ${i + 1}`, reply_to: null, attachments: [],
        created_at: new Date(start + i * 60_000).toISOString(),
      });
    }
    return send(res, 200, { ok: true });
  }

  const viewer = userFromRequest(req);

  if (url.pathname === "/auth/v1/user") {
    if (!viewer) return send(res, 401, { message: "invalid token" });
    return send(res, 200, { id: viewer.id, aud: "authenticated", role: "authenticated", email: viewer.email, app_metadata: {}, user_metadata: {}, created_at: new Date(0).toISOString() });
  }
  if (url.pathname.startsWith("/auth/v1/")) return send(res, 200, {});

  // Private message media: signed links (createSignedUrls) and serving them.
  const sign = url.pathname.match(/^\/storage\/v1\/object\/sign\/([\w-]+)$/);
  if (sign && req.method === "POST") {
    if (!viewer) return send(res, 401, { message: "JWT required" });
    const body = await readBody(req);
    return send(res, 200, (body?.paths ?? []).map((path) => {
      const readable = sign[1] === "message-media" && memberOf(viewer, path.split("/")[0]) && db.storage[`${sign[1]}/${path}`];
      return readable
        ? { path, signedURL: `/object/sign/${sign[1]}/${path}?token=t-${viewer.id}-${Date.now()}-${++seq}`, error: null }
        : { path, signedURL: null, error: "Object not found" };
    }));
  }
  const signed = url.pathname.match(/^\/storage\/v1\/object\/sign\/([\w-]+)\/(.+)$/);
  if (signed && (req.method === "GET" || req.method === "HEAD")) {
    const key = `${signed[1]}/${decodeURIComponent(signed[2])}`;
    const file = files[key];
    if (!file || !url.searchParams.get("token")) return send(res, 400, { message: "invalid signature" });
    res.writeHead(200, { "content-type": file.type, "content-length": file.bytes.length, "access-control-allow-origin": "*", "accept-ranges": "bytes" });
    return res.end(req.method === "HEAD" ? undefined : file.bytes);
  }

  const upload = url.pathname.match(/^\/storage\/v1\/object\/([\w-]+)\/(.+)$/);
  if (upload && req.method === "POST") {
    if (!viewer) return send(res, 401, { message: "JWT required" });
    const [, bucket, path] = upload;
    const folder = path.split("/")[0];
    const allowed = bucket === "message-media" ? memberOf(viewer, folder) && !conversationBlocked(viewer, folder) : folder === viewer.id;
    if (!allowed) return send(res, 403, { message: "new row violates row-level security policy" });
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    db.storage[`${bucket}/${path}`] = { size: bytes.length, type: req.headers["content-type"], owner: viewer.id };
    files[`${bucket}/${path}`] = { bytes, type: req.headers["content-type"] };
    return send(res, 200, { Key: `${bucket}/${path}`, Id: path });
  }
  const bulk = url.pathname.match(/^\/storage\/v1\/object\/([\w-]+)$/);
  if (bulk && req.method === "DELETE") {
    if (!viewer) return send(res, 401, { message: "JWT required" });
    const body = await readBody(req);
    const removed = [];
    for (const path of body?.prefixes ?? []) {
      // Own folder (post images), own file (message media), or queued for cleanup.
      const entry = db.storage[`${bulk[1]}/${path}`];
      const allowed = bulk[1] === "message-media"
        ? entry?.owner === viewer.id || db.storage_cleanup.includes(`message-media:${path}`)
        : path.split("/")[0] === viewer.id || db.storage_cleanup.includes(path);
      if (allowed && db.storage[`${bulk[1]}/${path}`]) {
        delete db.storage[`${bulk[1]}/${path}`];
        delete files[`${bulk[1]}/${path}`];
        removed.push({ name: path });
      }
    }
    return send(res, 200, removed);
  }

  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
  if (rpc) {
    const body = req.method === "POST" ? await readBody(req) : null;
    const result = RPC[rpc[1]] ? RPC[rpc[1]](viewer, body) : null;
    if (result && result.__error) return send(res, 400, { code: "P0001", message: result.__error });
    return send(res, 200, result);
  }

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
    const created = [];
    for (const row of rows) {
      if (table === "community_posts") {
        if (row.author_id !== viewer.id) return send(res, 403, { code: "42501", message: "new row violates row-level security policy" });
        if (!String(row.body || "").trim()) return send(res, 400, { code: "23514", message: "check constraint" });
        const post = { id: uuid(), hidden: false, reply_to: null, created_at: new Date().toISOString(), ...row };
        db.community_posts.push(post);
        created.push(post);
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
      } else if (table === "post_images") {
        const post = db.community_posts.find((p) => p.id === row.post_id);
        if (!post || post.author_id !== viewer.id) return send(res, 403, { code: "42501", message: "rls" });
        if (db.post_images.filter((i) => i.post_id === row.post_id).length >= 4) return send(res, 400, { message: "too_many_images" });
        db.post_images.push({ id: uuid(), ...row });
      } else if (table === "polls") {
        const post = db.community_posts.find((p) => p.id === row.post_id);
        if (!post || post.author_id !== viewer.id) return send(res, 403, { code: "42501", message: "rls" });
        if (!Array.isArray(row.options) || row.options.length < 2 || row.options.length > 4) return send(res, 400, { message: "check" });
        db.polls.push({ ...row });
      } else if (table === "poll_votes") {
        if (row.user_id !== viewer.id) return send(res, 403, { code: "42501", message: "rls" });
        const poll = db.polls.find((pl) => pl.post_id === row.post_id);
        if (!poll || new Date(poll.ends_at) <= new Date()) return send(res, 400, { message: "poll_closed" });
        if (row.option_index >= poll.options.length) return send(res, 400, { message: "invalid_option" });
        if (db.poll_votes.some((v) => v.post_id === row.post_id && v.user_id === viewer.id)) return send(res, 409, { code: "23505", message: "duplicate key" });
        db.poll_votes.push({ ...row });
      } else if (table === "messages") {
        if (row.sender_id !== viewer.id || !memberOf(viewer, row.conversation_id) || conversationBlocked(viewer, row.conversation_id)) {
          return send(res, 403, { code: "42501", message: "new row violates row-level security policy" });
        }
        const attachments = Array.isArray(row.attachments) ? row.attachments : [];
        if (String(row.body ?? "").length > 1000 || attachments.length > 4 || (!String(row.body ?? "").trim() && attachments.length === 0)) {
          return send(res, 400, { code: "23514", message: "messages_content_check" });
        }
        for (const item of attachments) {
          const entry = db.storage[`message-media/${item.path}`];
          if (!entry || entry.owner !== viewer.id || item.path.split("/")[0] !== row.conversation_id) return send(res, 400, { code: "P0001", message: "invalid_attachment" });
        }
        if (row.reply_to && !db.messages.some((m) => m.id === row.reply_to && m.conversation_id === row.conversation_id)) {
          return send(res, 400, { code: "P0001", message: "reply_target_missing" });
        }
        const message = { id: uuid(), reply_to: null, created_at: new Date().toISOString(), ...row, attachments };
        db.messages.push(message);
        const conversation = db.conversations.find((c) => c.id === row.conversation_id);
        if (conversation) conversation.last_message_at = message.created_at;
        const me = db.conversation_members.find((m) => m.conversation_id === row.conversation_id && m.user_id === viewer.id);
        if (me) me.last_read_at = message.created_at;
        created.push(message);
      } else if (table === "message_reactions") {
        const message = db.messages.find((m) => m.id === row.message_id);
        if (row.user_id !== viewer.id || !message || !memberOf(viewer, message.conversation_id) || conversationBlocked(viewer, message.conversation_id)) {
          return send(res, 403, { code: "42501", message: "rls" });
        }
        if (!["❤️", "😂", "😮", "😢", "🔥", "👍"].includes(row.emoji)) return send(res, 400, { code: "23514", message: "message_reactions_emoji_check" });
        const existing = db.message_reactions.find((r) => r.message_id === row.message_id && r.user_id === viewer.id);
        if (existing) {
          if (!prefer.includes("merge-duplicates")) return send(res, 409, { code: "23505", message: "duplicate key" });
          existing.emoji = row.emoji;
        } else {
          db.message_reactions.push({ created_at: new Date().toISOString(), ...row });
        }
      } else if (table === "blocks") {
        if (row.blocker_id !== viewer.id || row.blocked_id === viewer.id) return send(res, 403, { code: "42501", message: "rls" });
        if (!db.blocks.some((b) => b.blocker_id === row.blocker_id && b.blocked_id === row.blocked_id)) {
          db.blocks.push({ ...row, created_at: new Date().toISOString() });
        }
      } else {
        return send(res, 403, { message: `insert into ${table} not supported` });
      }
    }
    const out = created.length ? created : rows;
    if (String(req.headers.accept || "").includes("vnd.pgrst.object")) return send(res, 201, out[0]);
    return send(res, 201, prefer.includes("return=representation") ? out : undefined);
  }

  if (req.method === "DELETE") {
    if (!viewer) return send(res, 401, { message: "JWT required" });
    const owner = { community_posts: "author_id", post_reactions: "user_id", profile_follows: "follower_id", messages: "sender_id", message_reactions: "user_id", blocks: "blocker_id" }[table];
    if (!owner) return send(res, 403, { message: "delete not supported" });
    const doomed = applyFilters(db[table], url.searchParams).filter((row) => row[owner] === viewer.id);
    db[table] = db[table].filter((row) => !doomed.includes(row));
    if (table === "messages") {
      // Like the database: reactions cascade, replies keep a null target, files are queued.
      const ids = new Set(doomed.map((m) => m.id));
      db.message_reactions = db.message_reactions.filter((r) => !ids.has(r.message_id));
      for (const m of db.messages) if (m.reply_to && ids.has(m.reply_to)) m.reply_to = null;
      for (const m of doomed) queueMessageFiles(m);
    }
    if (table === "community_posts") {
      // Cascade like the database: replies (recursively) and everything attached.
      const ids = new Set(doomed.map((p) => p.id));
      let grew = true;
      while (grew) {
        grew = false;
        for (const p of db.community_posts) if (p.reply_to && ids.has(p.reply_to) && !ids.has(p.id)) { ids.add(p.id); grew = true; }
      }
      for (const image of db.post_images.filter((i) => ids.has(i.post_id))) {
        const path = image.url.split("/storage/v1/object/public/post-images/")[1];
        if (path && !db.storage_cleanup.includes(path)) db.storage_cleanup.push(path);
      }
      db.community_posts = db.community_posts.filter((p) => !ids.has(p.id));
      db.post_reactions = db.post_reactions.filter((r) => !ids.has(r.post_id));
      db.post_reports = db.post_reports.filter((r) => !ids.has(r.post_id));
      db.post_images = db.post_images.filter((i) => !ids.has(i.post_id));
      db.poll_votes = db.poll_votes.filter((v) => !ids.has(v.post_id));
      db.polls = db.polls.filter((pl) => !ids.has(pl.post_id));
    }
    const range = { "content-range": doomed.length ? `0-${doomed.length - 1}/${doomed.length}` : "*/0" };
    return send(res, prefer.includes("return=representation") ? 200 : 204, prefer.includes("return=representation") ? doomed : undefined, range);
  }

  if (req.method === "PATCH" && table === "messages") {
    // Edits: sender only, within 15 minutes, text only (mirrors the policy and trigger).
    if (!viewer) return send(res, 401, { message: "JWT required" });
    const body = await readBody(req);
    if (Object.keys(body ?? {}).some((key) => key !== "body")) return send(res, 403, { code: "42501", message: "permission denied for table messages" });
    const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
    const rows = applyFilters(db.messages, url.searchParams).filter((m) => m.sender_id === viewer.id && m.created_at > cutoff);
    for (const row of rows) {
      if (!String(body.body).trim() && !(row.attachments ?? []).length) return send(res, 400, { code: "23514", message: "messages_content_check" });
    }
    for (const row of rows) {
      row.body = body.body;
      row.edited_at = new Date().toISOString();
    }
    if (String(req.headers.accept || "").includes("vnd.pgrst.object")) {
      return rows.length ? send(res, 200, rows[0]) : send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: "The result contains 0 rows" });
    }
    return send(res, prefer.includes("return=representation") ? 200 : 204, prefer.includes("return=representation") ? rows : undefined);
  }

  if (req.method === "PATCH" && table === "conversation_members") {
    if (!viewer) return send(res, 401, { message: "JWT required" });
    const body = await readBody(req);
    const rows = applyFilters(db.conversation_members, url.searchParams).filter((m) => m.user_id === viewer.id);
    for (const row of rows) {
      if (body?.last_read_at) row.last_read_at = body.last_read_at;
      if (typeof body?.muted === "boolean") row.muted = body.muted;
      if (body?.cleared_at) row.cleared_at = body.cleared_at;
    }
    return send(res, 204);
  }

  return send(res, 405, { message: "method not allowed" });
}).listen(PORT, "127.0.0.1", () => console.log(`mock supabase on ${PORT}`));
