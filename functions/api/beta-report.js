// functions/api/beta-report.js

export async function onRequestPost({ request, env }) {
  const expected = env.DASHMSG_API_KEY || "";
  if (expected) {
    const got = request.headers.get("x-dashmsg-key") || "";
    if (got !== expected) return json({ ok: false, error: "unauthorized" }, 401);
  }

  const length = request.headers.get("content-length");
  if (length && Number(length) > 10000) return new Response("Payload too large", { status: 413 });

  let body = {};
  try { body = await request.json(); } catch {}
  if (!body || typeof body !== "object") return new Response("Bad Request", { status: 400 });

  if (!isAllowedOrigin(request, env)) return new Response("Forbidden", { status: 403 });

  const id = crypto.randomUUID();
  const ts = new Date().toISOString();

  const commonMeta = {
    id,
    ts,
    url: request.headers.get("referer") || null,
    ua: request.headers.get("user-agent") || null,
    ip: request.headers.get("cf-connecting-ip") || null,
    colo: request.headers.get("cf-ray") || null,
  };

  try {
    const text = String(body?.text || body?.message || "").trim();
    const meta = typeof body?.meta === "object" && body?.meta ? body.meta : {};

    if (!text) return json({ ok: false, error: "missing text" }, 400);

    await putJson(env, `reports/${ts}_${id}/report.json`, {
      ...commonMeta,
      kind: "text",
      text,
      meta,
    });

    return json({ ok: true, id }, 200);
  } catch (err) {
    return json({ ok: false, error: "server_error", detail: String(err?.message || err) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function putJson(env, key, obj) {
  if (!env.REPORTS_BUCKET) throw new Error("Missing R2 binding REPORTS_BUCKET");
  const body = JSON.stringify(obj, null, 2);
  await env.REPORTS_BUCKET.put(key, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const configured = String(env.ALLOWED_ORIGIN || "").trim();
  if (configured) {
    const allowedOrigins = configured
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return allowedOrigins.includes(origin);
  }

  return true;
}
