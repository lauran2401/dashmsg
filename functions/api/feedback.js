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

  const tester_id = body.tester_id || "unknown";
  const message = body.message || body.notes || "";
  const template = body.template || null;

  await env.DB.prepare(
    `INSERT INTO feedback (tester_id,message,template,created_at)
     VALUES (?,?,?,datetime('now'))`
  ).bind(tester_id, message, template).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
}
