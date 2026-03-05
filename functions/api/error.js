export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-dashmsg-key");
  if (!key || key !== env.DASHMSG_API_KEY) return new Response("Unauthorized", { status: 401 });

  const length = request.headers.get("content-length");
  if (length && Number(length) > 10000) return new Response("Payload too large", { status: 413 });

  let body = {};
  try { body = await request.json(); } catch {}
  if (!body || typeof body !== "object") return new Response("Bad Request", { status: 400 });

  const origin = request.headers.get("origin") || "";
  if (!origin.includes("pages.dev")) return new Response("Forbidden", { status: 403 });

  const now = Date.now();
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO errors
    (id, ts, tester_id, app_version, schema_version, message, stack, url, line, col)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, now, String(body.tester_id || "").slice(0, 80),
    String(body.app_version || "").slice(0, 40),
    Number(body.schema_version || 0),
    String(body.message || "").slice(0, 400),
    String(body.stack || "").slice(0, 2000),
    String(body.url || "").slice(0, 300),
    Number(body.line || 0), Number(body.col || 0)
  ).run();

  return new Response(JSON.stringify({ ok: true, id }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*" }
  });
}

export async function onRequestOptions({ request, env }) {
  return cors(env);
}

function cors(env) {
  const allowed = env.ALLOWED_ORIGIN || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-DashMsg-Key",
    }
  });
}
