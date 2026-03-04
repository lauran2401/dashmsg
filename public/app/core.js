/**
 * DashMsg Core Engine
 *
 * Responsibilities:
 * - State management and persistence
 * - Load defaults.json
 * - Template rendering with variable substitution
 * - Emoji toggle
 * - Clipboard copy (bulletproof)
 * - Shortcut return system
 * - Logging integration
 * - App initialization + nav stack
 */
const PREFS_VERSION = 1;
const DashMsg = (() => {
  const API_KEY = "DashMaster_2026!";
  const DEFAULTS_URL = "./defaults.json";
  const STORAGE_KEY = "dashmsg_state";
  const TESTER_ID_KEY = "dashmsg_tester_id";

  // API endpoints (Pages Functions route at /api/*)
  const API_LOG_URL = "/api/log";
  const API_FB_URL = "/api/feedback";
  
  function exitWithText(text) {
  if (returnUrl) {
    window.location.href = returnUrl + encodeURIComponent(text || "");
  } else {
    // no shortcut callback, just stay
  }
}
function exitApp() {
  exitWithText("");
}

  // Query parameters
  const params = new URLSearchParams(location.search);
  const returnUrl = params.get("return"); // should already include ...&text=
  const source = params.get("source") || "web";

  let defaults = {};
  let state = {
    prefs: {
      emoji_on: true,
      name_prompt: true,
      hotbag_default: true,
    },
    overrides: {
      templates: {}, // overrides only
      stores: [], // effective store list; if empty on load, set to defaults.stores
    },
    session: {
      customerName: "",
    },
  };

  let navStack = [];

  // ------------------------------
  // Defaults + persistence
  // ------------------------------
  async function loadDefaults() {
    try {
      const response = await fetch(DEFAULTS_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`defaults fetch failed: ${response.status}`);
      defaults = await response.json();

      // Merge saved state
      const saved = localStorage.getItem(STORAGE_KEY);

if (saved) {
  try {
    const savedState = JSON.parse(saved);

    state = {
      prefs: {
        ...state.prefs,
        ...(savedState?.prefs || {})
      },

      overrides: {
        templates: {
          ...(savedState?.overrides?.templates || {})
        },

        stores: Array.isArray(savedState?.overrides?.stores)
          ? savedState.overrides.stores
          : []
      },

      session: {
        ...state.session,
        ...(savedState?.session || {})
      }
    };

  } catch (e) {
    console.warn("DashMsg: corrupted localStorage, resetting", e);
    localStorage.removeItem(STORAGE_KEY);
  }
}

      // If stores not set yet, seed from defaults
      if (!Array.isArray(state.overrides.stores) || state.overrides.stores.length === 0) {
        state.overrides.stores = Array.isArray(defaults.stores) ? [...defaults.stores] : [];
      }

      saveState(); // normalize
      return true;
    } catch (e) {
      console.error("Failed to load defaults.json", e);
      return false;
    }
  }

  function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("DashMsg: failed saving state", e);
    }
  }

  function getVersions() {
    return {
      app_version: defaults.app_version || "0.1.0",
      schema_version: defaults.schema_version || 1,
    };
  }

  function getTesterId() {
    let id = localStorage.getItem(TESTER_ID_KEY);
    if (!id) {
      id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
      localStorage.setItem(TESTER_ID_KEY, id);
    }
    return id;
  }

  // ------------------------------
  // Templates + stores
  // ------------------------------
  function getTemplate(key) {
    if (state.overrides.templates && key in state.overrides.templates) {
      return state.overrides.templates[key];
    }
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
    const list = Array.isArray(state.overrides.stores)
      ? state.overrides.stores
      : (Array.isArray(defaults.stores) ? defaults.stores : []);
    return list.filter(Boolean);
  }

  function setStores(stores) {
    state.overrides.stores = Array.isArray(stores) ? stores.map(s => String(s).trim()).filter(Boolean) : [];
    saveState();
  }

  // ------------------------------
  // Rendering + emoji
  // ------------------------------
  function renderTemplate(tpl, vars = {}) {
    let s = String(tpl ?? "");
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
    return s;
  }

  function withEmoji(text, on) {
    const s = String(text ?? "");
    if (on) return s;
    return s
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDDFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ------------------------------
  // Logging
  // ------------------------------
  async function logEvent(key, category, extras = {}) {
    try {
      const versions = getVersions();
      await fetch(API_LOG_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashmsg-key": API_KEY,
        },
        body: JSON.stringify({
          tester_id: getTesterId(),
          source,
          app_version: versions.app_version,
          schema_version: versions.schema_version,
          category,
          template_key: key,
          ...extras,
        }),
      });
    } catch (e) {
      console.error("Log failed", e);
    }
  }

  // ------------------------------
  // Clipboard (bulletproof)
  // ------------------------------
  async function copyToClipboard(text) {
    const s = String(text ?? "");

    // 1) Modern clipboard
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(s);
        return true;
      }
    } catch {}

    // 2) Fallback (works in many WebViews)
    try {
      const el = document.createElement("textarea");
      el.value = s;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.top = "-1000px";
      document.body.appendChild(el);
      el.select();
      el.setSelectionRange(0, el.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return !!ok;
    } catch (e) {
      console.error("Failed to copy to clipboard", e);
      return false;
    }
  }

  // ------------------------------
  // Finish message
  // ------------------------------
  async function finishMessage(msg, key, category, extras = {}) {
    let usedName = 0;
    let out = String(msg ?? "");

    // Render store substitution if provided
    if ((key === "SHOP_SINGLE" || key === "SHOP_MULTIPLE") && extras.store) {
      out = renderTemplate(out, { STORE: extras.store });
    }

    // Name prompt
    if (state.prefs.name_prompt && out.startsWith("Hi!")) {
      const name = prompt("Customer name? (Cancel to skip)") || "";
      if (name.trim()) {
        out = out.replace(/^Hi!/, `Hi, ${name.trim()}!`);
        usedName = 1;
      }
    }

    // Emoji preference
    const final = withEmoji(out, state.prefs.emoji_on);

    // Fire logging (don’t block UX too hard, but await is fine here)
    await logEvent(key, category, { used_name: usedName, ...extras });

    // Copy (best-effort)
    const copied = await copyToClipboard(final);

    // Optional UI toast hook (no modal alerts)
    try {
      if (window.DashMsgUI && typeof window.DashMsgUI.toast === "function") {
        window.DashMsgUI.toast(final, copied);
      }
    } catch {}

    // Return to Shortcuts if configured
    if (returnUrl) {
      window.location.href = returnUrl + encodeURIComponent(final);
      return;
    }

    // Otherwise stay on page (Safari ignores window.close a lot)
    return;
  }

  // ------------------------------
  // Nav stack
  // ------------------------------
  function pushNav(screen) {
    navStack.push(screen);
  }

  function popNav() {
    if (navStack.length > 0) navStack.pop();
  }

  function getNavDepth() {
    return navStack.length;
  }

  // ------------------------------
  // Prefs
  // ------------------------------
  function togglePref(key) {
    if (Object.prototype.hasOwnProperty.call(state.prefs, key)) {
      state.prefs[key] = !state.prefs[key];
      saveState();
      return true;
    }
    return false;
  }

  function getPref(key) {
    return state.prefs[key];
  }

  function setPref(key, value) {
    state.prefs[key] = !!value;
    saveState();
  }

  // ------------------------------
  // Init
  // ------------------------------
  async function init() {
    const loaded = await loadDefaults();
    if (!loaded) {
      console.error("Failed to initialize DashMsg");
      // visible fail-safe
      const app = document.getElementById("app");
      if (app) app.innerHTML = "<pre style='padding:12px'>Failed to load defaults.json</pre>";
      return;
    }

    // Populate shopping menu if UI supports it
    if (window.DashMsgUI?.populateShoppingMenu) {
      window.DashMsgUI.populateShoppingMenu();
    }

    // Render main menu
    const mainMenu = window.DashMsgMenus?.main;
    if (mainMenu && window.DashMsgUI?.renderScreen) {
      window.DashMsgUI.renderScreen(mainMenu.title, mainMenu.sections);
      pushNav("main");
    } else {
      console.error("Missing DashMsgMenus.main or DashMsgUI.renderScreen");
    }
  }

  // Public API
  return {
    init,
    
    exitApp,
    exitWithText,

    // readonly snapshots
    state: () => JSON.parse(JSON.stringify(state)),
    defaults: () => JSON.parse(JSON.stringify(defaults)),

    // persistence
    saveState,

    // prefs
    getPref,
    setPref,
    togglePref,

    // templates
    getTemplate,
    setTemplate,
    resetTemplate,
    renderTemplate,

    // stores
    getStores,
    setStores,

    // messaging
    finishMessage,
    copyToClipboard,
    withEmoji,

    // logging
    logEvent,

    // nav
    pushNav,
    popNav,
    getNavDepth,
    navStack: () => [...navStack],

    // ids/versions
    getTesterId,
    getVersions,
  };
})();

// expose for inline handlers + boot
window.DashMsg = DashMsg;