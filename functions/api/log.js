export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-dashmsg-key");
  if (!key || key !== env.DASHMSG_API_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const length = request.headers.get("content-length");
  if (length && Number(length) > 10000) return new Response("Payload too large", { status: 413 });

  let body = {};
  try { body = await request.json(); } catch {}
  if (!body || typeof body !== "object") return new Response("Bad Request", { status: 400 });

  const origin = request.headers.get("origin") || "";
  if (!origin.includes("pages.dev")) return new Response("Forbidden", { status: 403 });

  const now = Date.now();
  const id = crypto.randomUUID();

  const tester_id = String(body.tester_id || "").slice(0, 80);
  if (!tester_id) return new Response("tester_id required", { status: 400 });

  const stmt = env.DB.prepare(`
    INSERT INTO events
    (id, ts, tester_id, source, app_version, schema_version, category, template_key,
     used_name, used_eta, used_hotbag, stops)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    id,
    now,
    tester_id,
    String(body.source || "").slice(0, 40),
    String(body.app_version || "").slice(0, 40),
    Number(body.schema_version || 0),
    String(body.category || "").slice(0, 40),
    String(body.template_key || "").slice(0, 80),
    body.used_name ? 1 : 0,
    body.used_eta ? 1 : 0,
    body.used_hotbag ? 1 : 0,
    String(body.stops || "").slice(0, 20),
  ).run();

  return new Response(JSON.stringify({ ok: true, id }), {
    headers: { "Content-Type": "application/json" }
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
