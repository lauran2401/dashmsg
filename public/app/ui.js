const LS_RECENT = "dashmsg_beta_recent";
const LS_PINS = "dashmsg_beta_pins";
const LS_QUEUE = "dashmsg_beta_queue";

function lsGet(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "");
  } catch {
    return fallback;
  }
}

function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

const FEEDBACK_CATALOG = [
  { id: "tpl_rename", cat: "Templates", title: "Rename template", desc: "Improve labels people see in the editor", tags: ["name", "label", "rename", "title"] },
  { id: "tpl_reorder", cat: "Templates", title: "Change template order", desc: "Better default ordering and grouping", tags: ["order", "sort", "group"] },
  { id: "tpl_wording", cat: "Templates", title: "Improve template wording", desc: "Make message clearer, shorter, more polite", tags: ["copy", "tone", "wording", "text"] },
  { id: "tpl_add", cat: "Templates", title: "Add new template", desc: "Missing scenario, add a new preset", tags: ["new", "missing", "scenario"] },
  { id: "tpl_vars", cat: "Templates", title: "Add placeholder/variable", desc: "Name/ETA/store/hot bag placeholders", tags: ["variable", "placeholder", "eta", "name"] },
  { id: "ui_spacing", cat: "UI", title: "Fix spacing/layout", desc: "Padding, alignment, dense/airy", tags: ["spacing", "layout", "padding"] },
  { id: "ui_nav", cat: "UI", title: "Navigation confusion", desc: "Hard to find a screen or go back", tags: ["navigation", "back", "home"] },
  { id: "ui_scroll", cat: "UI", title: "Scrolling issue", desc: "Scroll area feels wrong or stuck", tags: ["scroll", "overflow"] },
  { id: "auto_context", cat: "Automation", title: "Auto-suggest best template", desc: "Choose message based on context", tags: ["auto", "suggest", "smart"] },
  { id: "auto_eta", cat: "Automation", title: "Better ETA handling", desc: "ETA prompts, formatting, toggles", tags: ["eta", "time"] },
  { id: "bug_copy", cat: "Bug", title: "Copy/paste failure", desc: "Clipboard not working or wrong text", tags: ["copy", "clipboard", "paste"] },
  { id: "bug_save", cat: "Bug", title: "Save/reset failure", desc: "Edits not persisting or reset wrong", tags: ["save", "reset", "storage"] },
  { id: "bug_crash", cat: "Bug", title: "Crash/error", desc: "Screen breaks or JS error", tags: ["crash", "error"] }
];

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function scoreItem(q, item) {
  if (!q) return 0;
  const t = norm(item.title);
  const d = norm(item.desc);
  const tags = (item.tags || []).map(norm).join(" ");
  const qq = norm(q);

  if (t === qq) return 100;
  if (t.startsWith(qq)) return 80;
  if (t.includes(qq)) return 60;
  if (tags.includes(qq)) return 55;
  if (d.includes(qq)) return 35;

  const toks = qq.split(/\s+/).filter(Boolean);
  let hits = 0;
  for (const tok of toks) {
    if (t.includes(tok) || tags.includes(tok) || d.includes(tok)) hits++;
  }
  return hits ? 20 + hits * 6 : 0;
}

function uniqueById(arr) {
  const seen = new Set();
  return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

function getFeedbackContext() {
  return {
    url: location.href,
    screen: window.DashMsgUI?.currentScreen?.() || null,
    app_version: window.DashMsg?.defaults?.()?.app_version || null,
    tester_id: localStorage.getItem("dashmsg_tester_id") || null,
    debug: !!localStorage.getItem("dashmsg_debug")
  };
}

function initFeedbackCommandPalette() {
  const fab = document.getElementById("beta-fab");
  const panel = document.getElementById("beta-panel");
  const close = document.getElementById("beta-close");
  const search = document.getElementById("beta-search");
  const tabs = document.getElementById("beta-tabs");
  const results = document.getElementById("beta-results");
  const notes = document.getElementById("beta-notes");
  const send = document.getElementById("beta-send");

  if (!fab || !panel || !search || !tabs || !results || !notes || !send) return;

  let activeTab = "recent";
  let selectedId = null;
  let selectedIndex = 0;

  const pins = lsGet(LS_PINS, []);
  const recents = lsGet(LS_RECENT, []);

  function open() {
    panel.style.display = "block";
    search.value = "";
    notes.value = "";
    activeTab = "recent";
    setActiveTabUI();
    render();
    setTimeout(() => search.focus(), 0);
  }

  function hide() {
    panel.style.display = "none";
    selectedId = null;
    selectedIndex = 0;
  }

  fab.onclick = open;
  close.onclick = hide;

  document.addEventListener("pointerdown", (e) => {
    if (panel.style.display !== "block") return;
    if (e.target === panel || panel.contains(e.target) || e.target === fab) return;
    hide();
  });

  function setActiveTabUI() {
    tabs.querySelectorAll(".beta-tab").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.tab === activeTab);
    });
  }

  tabs.onclick = (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    activeTab = btn.dataset.tab;
    setActiveTabUI();
    render();
  };

  search.oninput = () => {
    activeTab = "all";
    setActiveTabUI();
    render();
  };

  function getTabItems() {
    const q = norm(search.value);

    if (activeTab === "categories") return [];

    if (activeTab === "all") {
      const scored = FEEDBACK_CATALOG
        .map((it) => ({ it, s: scoreItem(q, it) }))
        .filter((x) => (q ? x.s > 0 : true))
        .sort((a, b) => b.s - a.s);

      const pinnedItems = FEEDBACK_CATALOG.filter((it) => pins.includes(it.id));
      const recentItems = FEEDBACK_CATALOG.filter((it) => recents.includes(it.id));

      return uniqueById([
        ...pinnedItems,
        ...recentItems,
        ...scored.map((x) => x.it)
      ]);
    }

    const recentItems = FEEDBACK_CATALOG.filter((it) => recents.includes(it.id));
    const pinnedItems = FEEDBACK_CATALOG.filter((it) => pins.includes(it.id));
    return uniqueById([...pinnedItems, ...recentItems]);
  }

  function rowHtml(it) {
    const meta = (pins.includes(it.id) ? "Pinned" : (recents.includes(it.id) ? "Recent" : ""));
    return `
      <div class="beta-item" data-id="${it.id}">
        <div class="beta-item-main">
          <div class="beta-item-title">${it.title}</div>
          <div class="beta-item-desc">${it.desc}</div>
        </div>
        <div class="beta-item-meta">${meta}</div>
      </div>
    `;
  }

  function renderItems(list, withGroup) {
    let html = "";
    if (withGroup) {
      const byCat = {};
      list.forEach((it) => {
        byCat[it.cat] = byCat[it.cat] || [];
        byCat[it.cat].push(it);
      });
      Object.keys(byCat).forEach((cat) => {
        html += `<div class="beta-group">${cat}</div>`;
        html += byCat[cat].map((it) => rowHtml(it)).join("");
      });
      return html;
    }
    return list.map((it) => rowHtml(it)).join("");
  }

  function renderCategories() {
    const cats = [...new Set(FEEDBACK_CATALOG.map((x) => x.cat))].sort();
    const html = cats.map((cat) => {
      const count = FEEDBACK_CATALOG.filter((x) => x.cat === cat).length;
      return `
        <div class="beta-item" data-cat="${cat}">
          <div class="beta-item-main">
            <div class="beta-item-title">${cat}</div>
            <div class="beta-item-desc">${count} options</div>
          </div>
          <div class="beta-item-meta"></div>
        </div>
      `;
    }).join("");

    results.innerHTML = html || `<div class="beta-item"><div class="beta-item-main"><div class="beta-item-title">No categories</div></div></div>`;
    selectedIndex = 0;
    applySelection();
  }

  function render() {
    if (activeTab === "categories") {
      renderCategories();
      return;
    }

    const list = getTabItems();
    if (activeTab === "recent") {
      results.innerHTML = list.length
        ? renderItems(list, true)
        : `<div class="beta-item"><div class="beta-item-main"><div class="beta-item-title">No recent feedback</div><div class="beta-item-desc">Use “All” to pick a suggestion.</div></div></div>`;
    } else {
      results.innerHTML = list.length
        ? renderItems(list, true)
        : `<div class="beta-item"><div class="beta-item-main"><div class="beta-item-title">No matches</div><div class="beta-item-desc">Try different keywords.</div></div></div>`;
    }

    selectedIndex = 0;
    applySelection();
  }

  function applySelection() {
    const items = [...results.querySelectorAll(".beta-item")];
    items.forEach((el, i) => el.classList.toggle("is-selected", i === selectedIndex));
  }

  function selectByIndex(i) {
    const items = [...results.querySelectorAll(".beta-item")];
    if (!items.length) return;
    selectedIndex = Math.max(0, Math.min(i, items.length - 1));
    applySelection();
    items[selectedIndex].scrollIntoView({ block: "nearest" });
  }

  results.onclick = (e) => {
    const el = e.target.closest(".beta-item");
    if (!el) return;

    const id = el.dataset.id;
    const cat = el.dataset.cat;

    if (cat) {
      activeTab = "all";
      setActiveTabUI();
      search.value = cat;
      render();
      return;
    }

    if (id) {
      selectedId = id;
      const it = FEEDBACK_CATALOG.find((x) => x.id === id);
      if (it) search.value = it.title;
    }
  };

  panel.addEventListener("keydown", (e) => {
    if (panel.style.display !== "block") return;

    if (e.key === "Escape") { e.preventDefault(); hide(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); selectByIndex(selectedIndex + 1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); selectByIndex(selectedIndex - 1); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const items = [...results.querySelectorAll(".beta-item")];
      const el = items[selectedIndex];
      if (!el) return;

      const id = el.dataset.id;
      const cat = el.dataset.cat;
      if (cat) {
        activeTab = "all";
        setActiveTabUI();
        search.value = cat;
        render();
      } else if (id) {
        const it = FEEDBACK_CATALOG.find((x) => x.id === id);
        selectedId = id;
        if (it) search.value = it.title;
      }
    }
  });

  function pushRecent(id) {
    const r = lsGet(LS_RECENT, []);
    const next = [id, ...r.filter((x) => x !== id)].slice(0, 12);
    lsSet(LS_RECENT, next);
  }

  async function enqueueOrSend(payload) {
    try {
      await window.DashMsg?.sendFeedback?.(payload);
      return true;
    } catch {
      const q = lsGet(LS_QUEUE, []);
      q.push(payload);
      lsSet(LS_QUEUE, q);
      return false;
    }
  }

  send.onclick = async () => {
    const qTitle = norm(search.value);
    let cmd = selectedId ? FEEDBACK_CATALOG.find((x) => x.id === selectedId) : null;
    if (!cmd && qTitle) {
      cmd = FEEDBACK_CATALOG.find((x) => norm(x.title) === qTitle) || null;
    }

    const payload = {
      type: "smart_feedback",
      command_id: cmd?.id || null,
      command_title: cmd?.title || search.value || null,
      category: cmd?.cat || null,
      notes: notes.value || "",
      context: getFeedbackContext(),
      ts: Date.now()
    };

    const ok = await enqueueOrSend(payload);

    if (cmd?.id) pushRecent(cmd.id);
    hide();

    window.DashMsgUI?.toast?.(ok ? "Sent" : "Queued", true, "Saved");
  };
}

// public/app/ui.js — fixed (Home upper-left, Back only at bottom, no broken braces)

const DashMsgUI = (() => {
  const app = document.getElementById("app");
  let currentScreen = "main";
  let toastTimer = null;

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function safeAction(action) {
    try {
      return JSON.stringify(action || {});
    } catch {
      return "{}";
    }
  }

  function toast(text, ok = true, titleOverride = null) {
    let banner = document.getElementById("dashmsg-toast");

    if (!banner) {
      banner = document.createElement("div");
      banner.id = "dashmsg-toast";
      banner.className = "toast";
      banner.innerHTML = `
        <div class="toast-title"></div>
        <div class="toast-msg"></div>
      `;
      document.body.appendChild(banner);
    }

    const title = titleOverride || (ok ? "✓ Message Copied" : "Error");

    banner.classList.toggle("ok", !!ok);
    banner.classList.toggle("error", !ok);

    banner.querySelector(".toast-title").textContent = title;
    banner.querySelector(".toast-msg").textContent = String(text ?? "");

    banner.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => banner.classList.remove("show"), 2600);

    try {
      if (navigator.vibrate) navigator.vibrate(40);
    } catch {}
  }

  function headerHtml(title) {
    return `
      <div class="nav-bar">
        <button class="nav-btn home" data-action='{"type":"home"}'>Home</button>
        <div class="nav-title">${escapeHtml(title || "")}</div>
        <div class="nav-spacer"></div>
      </div>
    `;
  }

  function renderScreen(title, sections = []) {
    if (!app) return;

    let html = headerHtml(title);

    sections.forEach((section) => {
      if (section.header) {
        html += `<div class="menu-title">${escapeHtml(section.header)}</div>`;
      }

      html += `<div class="list">`;

      (section.items || []).forEach((item) => {
        if (item.static) {
          html += `
            <div class="row static-row">
              <span>${escapeHtml(item.label)}</span>
            </div>
          `;
          return;
        }

        const more = item.more ? `<span class="chev">›</span>` : "";
        const cls = item.class ? ` ${escapeHtml(item.class)}` : "";

        html += `
          <button class="row${cls}" data-action='${safeAction(item.action)}'>
            <span>${escapeHtml(item.label)}</span>
            ${more}
          </button>
        `;
      });

      html += `</div>`;
    });

    if (currentScreen !== "main") {
      html += `
        <div class="list bottom-back">
          <button class="row back" data-action='{"type":"navBack"}'>Back</button>
        </div>
      `;
    }

    app.innerHTML = html;
  }

  function dispatchAction(action) {
    if (!action || typeof action !== "object") return;

    const FN = {
      setETA,
      showTemplateEditor: () => window.DashMsgEditors?.showTemplateEditor(),
      showStoreEditor: () => window.DashMsgEditors?.showStoreEditor(),
      resetAll: () => window.DashMsgEditors?.resetAll(),
      editTemplate: () => window.DashMsgEditors?.editTemplate(action.key),
      saveTemplate: () => window.DashMsgEditors?.saveTemplate(action.key),
      resetTemplate: () => window.DashMsgEditors?.resetTemplate(action.key),
      editStore: () => window.DashMsgEditors?.editStore(action.idx),
      updateStore: () => window.DashMsgEditors?.updateStore(action.idx),
      removeStore: () => window.DashMsgEditors?.removeStore(action.idx),
      addStore: () => window.DashMsgEditors?.addStore(),
      saveNewStore: () => window.DashMsgEditors?.saveNewStore(),
      openBeta,
      sendFeedback: openFeedback,
      exportData,
      importData,
      copyTesterId,
      setEmojiOn: () => setPrefAndRefresh("emoji_on", true),
      setEmojiOff: () => setPrefAndRefresh("emoji_on", false),
      setNamePromptOn: () => setPrefAndRefresh("name_prompt", true),
      setNamePromptOff: () => setPrefAndRefresh("name_prompt", false),
      submitFeedback
    };

    switch (action.type) {
      case "template":
        return useTemplate(action.key, action.category, action.extras);
      case "nav":
        return navigateTo(action.screen);
      case "navBack":
        return navBack();
      case "cancel":
        return window.DashMsg?.exitApp?.();
      case "home":
        return goHome();
      case "function":
        if (FN[action.name]) return FN[action.name]();
        return toast("Action missing", false);
      default:
        return toast("Action missing", false);
    }
  }

  if (app) {
    app.addEventListener("click", (e) => {
      const btn = e.target.closest("button.row, button.nav-btn");
      if (!btn) return;

      let action = null;
      try {
        action = JSON.parse(btn.dataset.action || "{}");
      } catch {
        return toast("Action missing", false);
      }

      dispatchAction(action);
    });
  }

  function navigateTo(screen, options = {}) {
    const menu = window.DashMsgMenus?.[screen];
    if (!menu) return;

    const push = options.push !== false;
    if (push) window.DashMsg?.pushNav?.(screen);

    currentScreen = screen;

    if (screen === "shopping") populateShoppingMenu();

    renderScreen(menu.title, menu.sections);
  }

  function navBack() {
    window.DashMsg?.popNav?.();
    const stack = window.DashMsg?.navStack?.() || [];
    const prev = stack[stack.length - 1] || "main";
    navigateTo(prev, { push: false });
  }

  function goHome() {
    while ((window.DashMsg?.getNavDepth?.() || 0) > 0) {
      window.DashMsg.popNav();
    }
    navigateTo("main", { push: true });
  }

  async function useTemplate(key, category = "General", extras = {}) {
    const tpl = window.DashMsg?.getTemplate?.(key);
    if (!tpl) return toast("Template missing", false);
    await window.DashMsg?.finishMessage?.(tpl, key, category, extras);
  }

  function setETA() {
    const eta = prompt("ETA? (example: 5 min)");
    if (!eta) return;

    const tpl = window.DashMsg?.getTemplate?.("HEADING_WITH_ETA") || "";
    const rendered = window.DashMsg?.renderTemplate?.(tpl, { ETA: eta }) || "";

    window.DashMsg?.finishMessage?.(rendered, "HEADING_WITH_ETA", "Delivery", { used_eta: 1 });
  }

  function setPrefAndRefresh(key, value) {
    window.DashMsg?.setPref?.(key, value);
    toast("Saved", true, "Saved");
    navigateTo(currentScreen, { push: false });
  }

  function populateShoppingMenu() {
    const menu = window.DashMsgMenus?.shopping;
    if (!menu?.sections?.[0]) return;

    const stores = window.DashMsg?.getStores?.() || [];
    menu.sections[0].items = stores.map((store) => ({
      label: store,
      action: {
        type: "template",
        key: "SHOP_SINGLE",
        category: "Shopping",
        extras: { store }
      }
    }));
  }

  function openBeta() {
    const versions = window.DashMsg?.getVersions?.() || {};
    const state = window.DashMsg?.state?.() || {};
    const testerId = state.tester_id || "unknown";

    currentScreen = "beta";

    renderScreen("Help & Testing", [
      {
        header: "Need Help?",
        items: [
          { label: "Send Feedback", action: { type: "function", name: "sendFeedback" } }
        ]
      },
      {
        header: "Backup",
        items: [
          { label: "Export My Settings", action: { type: "function", name: "exportData" } },
          { label: "Import My Settings", action: { type: "function", name: "importData" } }
        ]
      },
      {
        header: "App Info",
        items: [
          { label: `App Version: ${versions.app_version || "-"}`, static: true },
          { label: `Tester ID: ${testerId}`, static: true },
          { label: "Copy Tester ID", action: { type: "function", name: "copyTesterId" } }
        ]
      }
    ]);
  }

  async function exportData() {
    const payload = window.DashMsg?.exportState?.();
    if (!payload) return toast("Export failed", false);
    const ok = await window.DashMsg?.copyToClipboard?.(payload);
    toast(ok ? "Export copied" : "Export failed", !!ok);
  }

  async function importData() {
    const raw = prompt("Paste export JSON");
    if (!raw) return;

    const result = window.DashMsg?.importState?.(raw);
    if (result?.ok) {
      populateShoppingMenu();
      toast("Settings imported", true);
      navigateTo("settings", { push: false });
    } else {
      toast(result?.error || "Import failed", false);
    }
  }

  function openFeedback() {
    currentScreen = "feedback";

    app.innerHTML = `
      ${headerHtml("Feedback")}
      <div class="list feedback-panel">
        <div class="feedback-wrap">
          <textarea id="feedback-input" class="feedback-input"
            placeholder="Tell us what happened or what you'd like improved"></textarea>
          <button class="row" data-action='{"type":"function","name":"submitFeedback"}'>
            <span>Send Feedback</span>
          </button>
        </div>
      </div>
      <div class="list bottom-back">
        <button class="row back" data-action='{"type":"navBack"}'>Back</button>
      </div>
    `;
  }

  async function submitFeedback() {
    const input = document.getElementById("feedback-input");
    const message = input?.value?.trim();
    if (!message) return toast("Please enter feedback", false);

    try {
      await window.DashMsg?.sendFeedback?.({ type: "legacy_feedback", notes: message, ts: Date.now() });
      toast("Feedback sent", true, "Thank you");
      navigateTo("main", { push: true });
    } catch {
      toast("Feedback failed", false);
    }
  }

  async function copyTesterId() {
    const tester = window.DashMsg?.getTesterId?.() || "";
    const ok = await window.DashMsg?.copyToClipboard?.(tester);
    toast(ok ? "Tester ID copied" : "Copy failed", !!ok);
  }

  return {
    renderScreen,
    navigateTo,
    navBack,
    goHome,
    dispatchAction,
    useTemplate,
    setETA,
    toast,
    openBeta,
    openFeedback,
    exportData,
    importData,
    populateShoppingMenu,
    currentScreen: () => currentScreen,
    setEmojiOn: () => setPrefAndRefresh("emoji_on", true),
    setEmojiOff: () => setPrefAndRefresh("emoji_on", false),
    setNamePromptOn: () => setPrefAndRefresh("name_prompt", true),
    setNamePromptOff: () => setPrefAndRefresh("name_prompt", false),
    copyTesterId
  };
})();

window.DashMsgUI = window.DashMsgUI || {};
Object.assign(window.DashMsgUI, DashMsgUI);
window.DashMsgUI.initFeedbackCommandPalette = initFeedbackCommandPalette;
