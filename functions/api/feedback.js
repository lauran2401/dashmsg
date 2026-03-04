export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-dashmsg-key");
  if (!key || key !== env.DASHMSG_API_KEY) return new Response("Unauthorized", { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return new Response("Bad JSON", { status: 400 }); }

  const now = Date.now();
  const id = crypto.randomUUID();
  const notes = String(body.notes || "").slice(0, 4000);
  const templates_json = body.templates_json ? JSON.stringify(body.templates_json).slice(0, 20000) : null;

  await env.DB.prepare(`
    INSERT INTO feedback
    (id, ts, tester_id, app_version, schema_version, notes, templates_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, now, String(body.tester_id || "").slice(0, 80),
    String(body.app_version || "").slice(0, 40),
    Number(body.schema_version || 0), notes, templates_json
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