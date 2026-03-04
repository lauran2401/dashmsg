/**
 * DashMsg UI Rendering System (Beefed + Safe)
 *
 * Goals:
 * - Zero “Unexpected end of script” from onclick strings
 * - No inline JS strings for actions (uses dataset + event delegation)
 * - Home button always available (topbar)
 * - Back + Cancel support (Cancel exits to Shortcut if return= provided)
 * - Green “Copied” banner (toast) with preview text
 * - Shopping menu auto-populates from user stores
 * - Lightweight + readable
 */

const DashMsgUI = (() => {
  const app = document.getElementById("app");
  if (!app) console.error("DashMsgUI: #app container missing");

  // ---------- toast ----------
  function ensureToast() {
    let banner = document.getElementById("copy-preview");
    let txt = document.getElementById("preview-text");

    if (!banner) {
      banner = document.createElement("div");
      banner.id = "copy-preview";
      banner.className = "copy-preview";
      banner.style.display = "none";
      banner.innerHTML = `
        <div class="copy-preview__label">Copied</div>
        <div id="preview-text" class="copy-preview__text"></div>
      `;
      // Prefer inside body top; iOS web view behaves better
      document.body.prepend(banner);
      txt = document.getElementById("preview-text");
    }
    return { banner, txt };
  }

  function showCopied(text) {
    const { banner, txt } = ensureToast();
    txt.textContent = String(text || "");
    banner.style.display = "block";
    clearTimeout(showCopied._t);
    showCopied._t = setTimeout(() => {
      banner.style.display = "none";
    }, 1800);
  }

  // ---------- html safety ----------
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  // ---------- action serialization ----------
  function encodeAction(action) {
    try {
      return encodeURIComponent(JSON.stringify(action || {}));
    } catch {
      return encodeURIComponent("{}");
    }
  }

  function decodeAction(encoded) {
    try {
      return JSON.parse(decodeURIComponent(encoded || "%7B%7D"));
    } catch {
      return {};
    }
  }

  // ---------- topbar ----------
  function topbarHtml(title) {
    return `
      <div class="topbar">
        <button class="topbar-btn" data-ui="home">Home</button>
        <div class="topbar-title">${escapeHtml(title || "")}</div>
        <button class="topbar-btn muted" data-ui="back">Back</button>
      </div>
    `;
  }

  // ---------- render ----------
  function renderScreen(title, sections) {
    if (!app) return;

    let html = topbarHtml(title);

    (sections || []).forEach((section) => {
      if (section.header) {
        html += `<div class="menu-title">${escapeHtml(section.header)}</div>`;
      }

      const items = section.items || [];
      html += `<div class="list">`;

      items.forEach((item) => {
        const cls = item.class ? ` ${escapeHtml(item.class)}` : "";
        const more = item.more ? `<span class="chev">›</span>` : `<span class="chev"></span>`;
        const action = item.action ? item.action : (item.click ? { type: "raw", handler: item.click } : { type: "noop" });

        html += `
          <button class="row${cls}"
                  data-action="${encodeAction(action)}">
            <span class="row-label">${escapeHtml(item.label)}</span>
            ${more}
          </button>
        `;
      });

      html += `</div>`;
    });

    app.innerHTML = html;

    // Single delegated listener per render
    app.onclick = (ev) => {
      const btn = ev.target.closest("button.row, button.topbar-btn");
      if (!btn) return;

      const ui = btn.getAttribute("data-ui");
      if (ui === "home") return goHome();
      if (ui === "back") return navBack();

      if (btn.classList.contains("row")) {
        const action = decodeAction(btn.getAttribute("data-action"));
        runAction(action);
      }
    };
  }

  // ---------- navigation ----------
  function navigateTo(screenName, { push = true } = {}) {
    const menu = window.DashMsgMenus?.[screenName];
    if (!menu) {
      console.error("DashMsgUI: menu not found:", screenName);
      return;
    }
    if (push) window.DashMsg?.pushNav?.(screenName);
    renderScreen(menu.title, menu.sections);
  }

  function goHome() {
    // Reset nav stack to just main (prevents stack bloat)
    try {
      // If you want hard reset stack:
      // (not required, but keeps behavior clean)
      // We can't directly mutate DashMsg internal navStack; so we do a simple approach:
      // pop until empty, then push "main"
      while (window.DashMsg?.getNavDepth?.() > 0) window.DashMsg.popNav();
    } catch {}
    navigateTo("main", { push: true });
  }

  function navBack() {
    window.DashMsg?.popNav?.();
    const stack = window.DashMsg?.navStack?.() || [];
    if (!stack.length) return navigateTo("main", { push: true });

    const prev = stack[stack.length - 1];
    // do NOT push again, we are rendering the existing stack top
    navigateTo(prev, { push: false });
  }

  // ---------- actions ----------
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
        return runFunctionString(action.handler);
      case "raw":
        return runFunctionString(action.handler);
      default:
        return;
    }
  }

  function runFunctionString(code) {
    if (!code) return;
    try {
      // Executes trusted local strings (your own menus.js).
      // This is safer than inline onclick because it won't break HTML.
      (new Function(code))();
    } catch (e) {
      console.error("DashMsgUI: function handler failed:", e);
      alert(e?.message || String(e));
    }
  }

  // ---------- template execution ----------
  async function useTemplate(key, category = "Message", extras = {}) {
    const template = window.DashMsg?.getTemplate?.(key);
    if (!template) {
      console.error("DashMsgUI: template not found:", key);
      return;
    }
    // DashMsg.finishMessage already handles name prompt + emojis + copy + return
    const before = template;
    await window.DashMsg.finishMessage(before, key, category, extras);

    // If DashMsg returned via Shortcut, you may never see this.
    // But if user opened web directly, this is visible.
    // Show copied preview if we can reconstruct final (best effort).
    try {
      // DashMsg.finishMessage copies the final text; we can show the raw template too,
      // but we'd rather not lie. If return is missing, it shows alert already.
      // Keep toast minimal: show key
      showCopied(`Sent: ${key}`);
    } catch {}
  }

  // ---------- ETA ----------
  function setETA() {
    const eta = prompt("ETA? (example: 5 min)");
    if (!eta) return;

    const tpl = window.DashMsg?.getTemplate?.("HEADING_WITH_ETA") || "";
    const msg = window.DashMsg?.renderTemplate?.(tpl, { ETA: eta }) || "";
    window.DashMsg?.finishMessage?.(msg, "HEADING_WITH_ETA", "Delivery", { used_eta: 1 });
  }

  // ---------- shopping population ----------
  function populateShoppingMenu() {
    const menu = window.DashMsgMenus?.shopping;
    if (!menu || !menu.sections || !menu.sections.length) return;

    const stores = window.DashMsg?.getStores?.() || [];
    menu.sections[0].items = (stores || []).map((store) => ({
      label: store,
      action: {
        type: "template",
        key: "SHOP_SINGLE",
        category: "Shopping",
        extras: { store }
      }
    }));
  }

  // ---------- cancel/exit ----------
  function exitApp() {
    // If DashMsg has a formal exit function, use it.
    if (window.DashMsg?.exitApp) return window.DashMsg.exitApp();

    // Otherwise: return empty to Shortcut if return= exists, else close.
    const params = new URLSearchParams(location.search);
    const ret = params.get("return");
    if (ret) {
      try { location.href = ret; } catch { /* ignore */ }
      return;
    }
    try { window.close(); } catch { /* ignore */ }
  }

  // ---------- public ----------
  return {
    renderScreen,
    navigateTo,
    navBack,
    goHome,
    runAction,
    useTemplate,
    setETA,
    populateShoppingMenu,
    showCopied,
    escapeHtml,
    exitApp,
  };
})();

window.DashMsgUI = DashMsgUI;