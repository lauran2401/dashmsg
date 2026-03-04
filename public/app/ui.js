const DashMsgUI = (() => {
  const app = document.getElementById("app");
  if (!app) console.error("DashMsgUI: #app container missing");

  // ---------- toast ----------
  function ensureToast() {
    let t = document.getElementById("dashmsg-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "dashmsg-toast";
      t.className = "toast";
      t.innerHTML = `<div class="kicker" id="toast-kicker"></div><div class="msg" id="toast-msg"></div>`;
      document.body.appendChild(t);
    }
    return t;
  }

  function toast(kicker, msg, ms = 1400) {
    const t = ensureToast();
    const k = document.getElementById("toast-kicker");
    const m = document.getElementById("toast-msg");
    k.textContent = kicker || "";
    m.textContent = msg || "";
    t.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.style.display = "none"), ms);
  }

  // ---------- haptics (best effort) ----------
  function haptic(kind = "light") {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(kind === "success" ? 20 : 10);
      }
    } catch {}
  }

  // ---------- html safety ----------
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function encodeAction(action) {
    try { return encodeURIComponent(JSON.stringify(action || {})); }
    catch { return encodeURIComponent("{}"); }
  }
  function decodeAction(encoded) {
    try { return JSON.parse(decodeURIComponent(encoded || "%7B%7D")); }
    catch { return {}; }
  }

  // ---------- topbar ----------
  function topbarHtml(title) {
  return `
    <div class="topbar">
      <div class="topbar-inner">
        <button class="topbar-btn" data-ui="home">Home</button>
        <div class="topbar-title">${escapeHtml(title || "")}</div>
      </div>
    </div>
  `;
}
  // ---------- render ----------
  function renderScreen(title, sections, opts = {}) {
    if (!app) return;

    const subtitle = opts.subtitle || "";
    let html = topbarHtml(title, subtitle);

    (sections || []).forEach((section) => {
      if (section.header) html += `<div class="menu-title">${escapeHtml(section.header)}</div>`;

      const items = section.items || [];
      html += `<div class="list">`;

      items.forEach((item) => {
        const cls = item.class ? ` ${escapeHtml(item.class)}` : "";
        const action = item.action ? item.action : (item.click ? { type: "raw", handler: item.click } : { type: "noop" });

        // optional “status pill” for toggles
        let pill = "";
        if (item.pill === "pref" && item.prefKey) {
          const v = !!window.DashMsg?.getPref?.(item.prefKey);
          pill = `<span class="pill ${v ? "on" : "off"}">${v ? "ON" : "OFF"}</span>`;
        }

        const more = item.more ? `<span class="chev">›</span>` : `<span class="chev"></span>`;

        html += `
          <button class="row${cls}" data-action="${encodeAction(action)}">
            <span class="row-label">${escapeHtml(item.label)}${pill}</span>
            ${more}
          </button>
        `;
      });

      html += `</div>`;
    });

    app.innerHTML = html;

    // delegated click handling
    app.onclick = (ev) => {
      const btn = ev.target.closest("button.row, button.topbar-btn");
      if (!btn) return;

      const ui = btn.getAttribute("data-ui");
      if (ui === "home") return goHome();
     

      if (btn.classList.contains("row")) {
        const action = decodeAction(btn.getAttribute("data-action"));
        runAction(action);
      }
    };
  }

  // ---------- nav ----------
  function navigateTo(screenName, { push = true } = {}) {
    const menu = window.DashMsgMenus?.[screenName];
    if (!menu) return console.error("DashMsgUI: menu not found:", screenName);
    if (push) window.DashMsg?.pushNav?.(screenName);

    // subtle helpful subtitles
    const subtitleMap = {
    };

    renderScreen(menu.title, menu.sections, { subtitle: subtitleMap[screenName] || "" });
  }

  function goHome() {
    try { while (window.DashMsg?.getNavDepth?.() > 0) window.DashMsg.popNav(); } catch {}
    navigateTo("main", { push: true });
  }

  function navBack() {
    window.DashMsg?.popNav?.();
    const stack = window.DashMsg?.navStack?.() || [];
    if (!stack.length) return navigateTo("main", { push: true });
    navigateTo(stack[stack.length - 1], { push: false });
  }

  // ---------- action runner ----------
  function runFunctionString(code) {
    if (!code) return;
    try { (new Function(code))(); }
    catch (e) { console.error(e); alert(e?.message || String(e)); }
  }

  function runAction(action) {
    if (!action || typeof action !== "object") return;

    switch (action.type) {
      case "template":
        return useTemplate(action.key, action.category || "Message", action.extras || {});
      case "nav":
        return navigateTo(action.screen);
      case "navBack":
        return navBack();
      case "cancel":
        return exitApp();
      case "function":
      case "raw":
        return runFunctionString(action.handler);
      case "togglePref":
        return togglePref(action.key);
      default:
        return;
    }
  }

  // ---------- pref toggle (with toast) ----------
  function togglePref(key) {
    const ok = window.DashMsg?.togglePref?.(key);
    if (!ok) return;

    const v = !!window.DashMsg?.getPref?.(key);
    haptic("light");
    toast("Setting", `${humanPref(key)}: ${v ? "ON" : "OFF"}`);

    // re-render current screen so pills update instantly
    const stack = window.DashMsg?.navStack?.() || [];
    const cur = stack.length ? stack[stack.length - 1] : "main";
    navigateTo(cur, { push: false });
  }

  function humanPref(key) {
    if (key === "emoji_on") return "Emojis";
    if (key === "name_prompt") return "Name prompt";
    if (key === "hotbag_default") return "Hot bag default";
    return key;
  }

  // ---------- messaging ----------
  async function useTemplate(key, category = "Message", extras = {}) {
    const template = window.DashMsg?.getTemplate?.(key);
    if (!template) return console.error("DashMsgUI: template missing:", key);

    haptic("light");

    await window.DashMsg.finishMessage(template, key, category, extras);

    // If running “web only” (no return param), user stays on page → show toast.
    // If running from Shortcut, it will return immediately anyway.
    toast("Copied", key);
    haptic("success");
  }

  function setETA() {
    const eta = prompt("ETA? (example: 5 min)");
    if (!eta) return;

    const tpl = window.DashMsg?.getTemplate?.("HEADING_WITH_ETA") || "";
    const msg = window.DashMsg?.renderTemplate?.(tpl, { ETA: eta }) || "";

    haptic("light");
    window.DashMsg?.finishMessage?.(msg, "HEADING_WITH_ETA", "Delivery", { used_eta: 1 });
    toast("Copied", `ETA: ${eta}`);
    haptic("success");
  }

  function populateShoppingMenu() {
    const menu = window.DashMsgMenus?.shopping;
    if (!menu || !menu.sections?.length) return;

    const stores = window.DashMsg?.getStores?.() || [];
    menu.sections[0].items = (stores || []).map((store) => ({
      label: store,
      action: { type: "template", key: "SHOP_SINGLE", category: "Shopping", extras: { store } }
    }));
  }

  // ---------- exit ----------
  function exitApp() {
    if (window.DashMsg?.exitApp) return window.DashMsg.exitApp();
    const params = new URLSearchParams(location.search);
    const ret = params.get("return");
    if (ret) { try { location.href = ret; } catch {} return; }
    try { window.close(); } catch {}
  }

  return {
    renderScreen,
    navigateTo,
    navBack,
    goHome,
    runAction,
    useTemplate,
    setETA,
    populateShoppingMenu,
    togglePref,
    toast,
    haptic,
  };
})();

window.DashMsgUI = DashMsgUI;