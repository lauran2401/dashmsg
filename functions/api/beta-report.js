// functions/api/beta-report.js

export async function onRequestPost({ request, env }) {
  // --- Basic auth (optional but recommended) ---
  const expected = env.DASHMSG_KEY || "";
  if (expected) {
    const got = request.headers.get("x-dashmsg-key") || "";
    if (got !== expected) return json({ ok: false, error: "unauthorized" }, 401);
  }

  const ct = (request.headers.get("content-type") || "").toLowerCase();
  const id = crypto.randomUUID();
  const ts = new Date().toISOString();

  // Common metadata (works for both JSON and multipart)
  const commonMeta = {
    id,
    ts,
    url: request.headers.get("referer") || null,
    ua: request.headers.get("user-agent") || null,
    ip: request.headers.get("cf-connecting-ip") || null,
    colo: request.headers.get("cf-ray") || null,
  };

  try {
    // --- JSON: text-only ---
    if (ct.includes("application/json")) {
      const body = await request.json().catch(() => null);
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
    }

    // --- Multipart: screenshot + metadata ---
    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();

      const file = form.get("file"); // File (Blob)
      const text = String(form.get("text") || "").trim();
      const metaRaw = String(form.get("meta") || "").trim();

      let meta = {};
      if (metaRaw) {
        try { meta = JSON.parse(metaRaw); } catch { meta = { _meta_parse_failed: true, metaRaw }; }
      }

      const prefix = `reports/${ts}_${id}/`;

      // Always write a metadata JSON so you can browse/debug later
      await putJson(env, `${prefix}report.json`, {
        ...commonMeta,
        kind: file ? "screenshot" : "form",
        text: text || null,
        meta,
        has_file: !!file,
      });

      // If file provided, store it in R2
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const buf = await file.arrayBuffer();
        const filename = sanitizeName(file.name || "screenshot.png");
        const contentType = file.type || "application/octet-stream";

        await putObject(env, `${prefix}${filename}`, buf, contentType);
      }

      return json({ ok: true, id }, 200);
    }

    // --- Unsupported content-type ---
    return json({ ok: false, error: "unsupported content-type" }, 415);
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

function sanitizeName(name) {
  // keep it simple + safe for R2 keys
  return String(name)
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "upload.bin";
}

async function putJson(env, key, obj) {
  if (!env.REPORTS_BUCKET) throw new Error("Missing R2 binding REPORTS_BUCKET");
  const body = JSON.stringify(obj, null, 2);
  await env.REPORTS_BUCKET.put(key, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

async function putObject(env, key, arrayBuffer, contentType) {
  if (!env.REPORTS_BUCKET) throw new Error("Missing R2 binding REPORTS_BUCKET");
  await env.REPORTS_BUCKET.put(key, arrayBuffer, {
    httpMetadata: { contentType },
  });
}