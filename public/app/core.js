import { API_HEADERS } from "./config.js";

const DashMsg = (() => {
  const DEFAULTS_URL = "./defaults.json";
  const STORAGE_KEY = "dashmsg_state";
  const TESTER_ID_KEY = "dashmsg_tester_id";
  const DEBUG_KEY = "dashmsg_debug";
  const API_LOG_URL = "/api/log";
  const API_FB_URL = "/api/feedback";

  const params = new URLSearchParams(location.search);
  const returnUrl = params.get("return");
  const source = params.get("source") || "web";

  let defaults = {};
  let navStack = [];
  let state = {
    prefs: {
      emoji_on: true,
      name_prompt: true,
      hotbag_default: true
    },
    overrides: {
      templates: {},
      stores: []
    },
    session: {
      customerName: ""
    },
    tester_id: "unknown"
  };

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async function loadDefaults() {
    try {
      const res = await fetch(DEFAULTS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`defaults fetch failed: ${res.status}`);
      defaults = await res.json();

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          state.prefs = { ...state.prefs, ...(parsed.prefs || {}) };
          state.overrides.templates = { ...(parsed.overrides?.templates || {}) };
          state.overrides.stores = Array.isArray(parsed.overrides?.stores) ? parsed.overrides.stores : [];
          state.session = { ...state.session, ...(parsed.session || {}) };
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      if (!state.overrides.stores.length) {
        state.overrides.stores = Array.isArray(defaults.stores) ? [...defaults.stores] : [];
      }

      state.tester_id = getTesterId();
      saveState();

      window.addEventListener("error", async (e) => {
        try {
          await fetch("/api/error", {
            method: "POST",
            headers: API_HEADERS,
            body: JSON.stringify({
              tester_id: state?.tester_id || "unknown",
              message: e.message,
              stack: e.error?.stack || "",
              url: location.href
            })
          });
        } catch {}
      });

      window.addEventListener("unhandledrejection", async (e) => {
        try {
          await fetch("/api/error", {
            method: "POST",
            headers: API_HEADERS,
            body: JSON.stringify({
              tester_id: state?.tester_id || "unknown",
              message: "Unhandled promise rejection",
              stack: String(e.reason),
              url: location.href
            })
          });
        } catch {}
      });

      return true;
    } catch (err) {
      console.error("Failed to load defaults", err);
      return false;
    }
  }

  function getTemplate(key) {
    if (Object.prototype.hasOwnProperty.call(state.overrides.templates, key)) return state.overrides.templates[key];
    return defaults.templates?.[key] || "";
  }

  function setTemplate(key, value) {
    state.overrides.templates[key] = String(value ?? "");
    saveState();
  }


  function resetTemplate(key) {
    delete state.overrides.templates[key];
    saveState();
  }

  function getStores() {
    return (Array.isArray(state.overrides.stores) ? state.overrides.stores : []).slice();
  }

  function setStores(stores) {
    state.overrides.stores = Array.isArray(stores)
      ? stores.map((s) => String(s).trim()).filter(Boolean)
      : [];
    saveState();
  }

  function setPref(key, value) {
    state.prefs[key] = !!value;
    saveState();
  }

  function getPref(key) {
    return !!state.prefs[key];
  }

  function renderTemplate(tpl, vars = {}) {
    let output = String(tpl || "");
    Object.entries(vars).forEach(([k, v]) => {
      output = output.split(`{${k}}`).join(String(v));
    });
    return output;
  }

  function withEmoji(text, on) {
    if (on) return String(text || "");
    return String(text || "")
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDDFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function copyToClipboard(text) {
    const value = String(text || "");
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {}

    try {
      const el = document.createElement("textarea");
      el.value = value;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.top = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return !!ok;
    } catch {
      return false;
    }
  }

  function getVersions() {
    return {
      app_version: defaults.app_version || "0.1.0",
      schema_version: defaults.schema_version || 1
    };
  }

  function getTesterId() {
    let id = localStorage.getItem(TESTER_ID_KEY);
    if (!id) {
      id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      localStorage.setItem(TESTER_ID_KEY, id);
    }
    return id;
  }

  async function logEvent(key, category, extras = {}) {
    try {
      const versions = getVersions();
      await fetch(API_LOG_URL, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          tester_id: getTesterId(),
          source,
          app_version: versions.app_version,
          schema_version: versions.schema_version,
          category,
          template_key: key,
          ...extras
        })
      });
    } catch (err) {
      if (isDebug()) console.error("log failed", err);
    }
  }

  async function sendFeedback(payload) {
    const body = {
      tester_id: getTesterId(),
      message: typeof payload === "string" ? payload : JSON.stringify(payload)
    };

    const r = await fetch(API_FB_URL, {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify(body)
    });

    if (!r.ok) throw new Error("feedback_failed");
    return true;
  }

  async function flushFeedbackQueue() {
    const q = (() => {
      try { return JSON.parse(localStorage.getItem("dashmsg_beta_queue") || "[]"); } catch { return []; }
    })();
    if (!q.length) return;

    const keep = [];
    for (const payload of q) {
      try {
        await sendFeedback(payload);
      } catch {
        keep.push(payload);
      }
    }
    localStorage.setItem("dashmsg_beta_queue", JSON.stringify(keep));
  }

  async function finishMessage(msg, key, category, extras = {}) {
    let output = String(msg || "");
    if ((key === "SHOP_SINGLE" || key === "SHOP_MULTIPLE") && extras.store) {
      output = renderTemplate(output, { STORE: extras.store });
    }

    let usedName = 0;
    if (state.prefs.name_prompt && output.startsWith("Hi!")) {
      const name = prompt("Customer name? (Cancel to skip)") || "";
      if (name.trim()) {
        output = output.replace(/^Hi!/, `Hi, ${name.trim()}!`);
        usedName = 1;
      }
    }

    const final = withEmoji(output, state.prefs.emoji_on);
    await logEvent(key, category, { used_name: usedName, ...extras });
    const copied = await copyToClipboard(final);

    if (window.DashMsgUI?.toast) window.DashMsgUI.toast(final, copied);

    if (returnUrl) {
      window.location.href = returnUrl + encodeURIComponent(final);
    }
  }

  function exitWithText(text) {
    if (returnUrl) {
      window.location.href = returnUrl + encodeURIComponent(text || "");
    }
  }

  function exitApp() {
    if (returnUrl) {
      exitWithText("");
      return;
    }
    if (window.DashMsgUI?.toast) window.DashMsgUI.toast("Canceled", true, "Saved");
  }

  function exportState() {
    const versions = getVersions();
    return JSON.stringify({
      prefs: { ...state.prefs },
      overrides: {
        templates: { ...state.overrides.templates },
        stores: getStores()
      },
      exported_at: new Date().toISOString(),
      defaults_app_version: versions.app_version,
      schema_version: versions.schema_version,
      tester_id: getTesterId()
    }, null, 2);
  }

  function importState(jsonString) {
    try {
      const parsed = JSON.parse(String(jsonString || ""));
      if (!parsed || typeof parsed !== "object" || !parsed.prefs || !parsed.overrides) {
        return { ok: false, error: "Invalid payload" };
      }

      Object.entries(parsed.prefs).forEach(([k, v]) => setPref(k, !!v));
      setStores(Array.isArray(parsed.overrides.stores) ? parsed.overrides.stores : []);

      const templates = parsed.overrides.templates || {};
      Object.keys(templates).forEach((key) => setTemplate(key, templates[key]));

      saveState();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: "Import parse failed" };
    }
  }

  function isDebug() {
    return localStorage.getItem(DEBUG_KEY) === "1";
  }

  function setDebug(on) {
    localStorage.setItem(DEBUG_KEY, on ? "1" : "0");
  }

  function pushNav(screen) {
    navStack.push(screen);
  }

  function popNav() {
    navStack.pop();
  }

  function getNavDepth() {
    return navStack.length;
  }

  async function checkUpdate() {
    const r = await fetch("./defaults.json", { cache: "no-store" });
    const d = await r.json();
    const local = state?.app_version || null;

    if (local && local !== d.app_version) {
      alert("DashMsg updated to " + d.app_version);
    }

    state.app_version = d.app_version;
    localStorage.setItem("dashmsg_state", JSON.stringify(state));
  }

  async function init() {
    const ok = await loadDefaults();
    if (!ok) {
      const app = document.getElementById("app");
      if (app) app.innerHTML = "<pre style='padding:12px'>Failed to load defaults.json</pre>";
      return;
    }

    try {
      await checkUpdate();
    } catch {}

    window.DashMsgUI?.populateShoppingMenu?.();
    await flushFeedbackQueue();
    window.DashMsgUI?.navigateTo?.("main", { push: true });
    window.DashMsgUI?.initFeedbackCommandPalette?.();
  }

  return {
    init,
    state: () => JSON.parse(JSON.stringify(state)),
    defaults: () => JSON.parse(JSON.stringify(defaults)),
    saveState,
    getPref,
    setPref,
    getTemplate,
    setTemplate,
    resetTemplate,
    renderTemplate,
    getStores,
    setStores,
    finishMessage,
    copyToClipboard,
    withEmoji,
    logEvent,
    sendFeedback,
    pushNav,
    popNav,
    getNavDepth,
    navStack: () => navStack.slice(),
    getTesterId,
    getVersions,
    exitWithText,
    exitApp,
    exportState,
    importState,
    isDebug,
    setDebug
  };
})();

window.DashMsg = DashMsg;
