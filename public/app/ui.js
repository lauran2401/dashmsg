
const LS_RECENT = "dashmsg_beta_recent";
const LS_PINS = "dashmsg_beta_pins";
const LS_QUEUE = "dashmsg_beta_queue";
const LS_DRAFT = "dashmsg_beta_draft";
const LS_LAST_SUBMISSIONS = "dashmsg_beta_last_submissions";

function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || ""); } catch { return fallback; }
}
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function norm(s) { return String(s || "").toLowerCase().trim(); }

function getFeedbackContext() {
  return {
    route: location.pathname,
    url: location.href,
    screen: window.DashMsgUI?.currentScreen?.() || null,
    last_action: window.DashMsgUI?.lastAction?.() || null,
    app_version: window.DashMsg?.defaults?.()?.app_version || null,
    platform: navigator.platform || null,
    device: navigator.userAgent || null,
    browser: navigator.userAgent || null,
    timestamp: Date.now()
  };
}

function boost(item, recents, pins) {
  const pop = Math.min(Number(item.globalUseCount || 0), 100) / 20;
  const pri = Number(item.priority || 0) * 2;
  const recent = recents.includes(item.id) ? 8 : 0;
  const pin = pins.includes(item.id) ? 10 : 0;
  return pop + pri + recent + pin;
}

function buildMiniSearch(docs) {
  const MiniSearchCtor = window.MiniSearch;
  if (!MiniSearchCtor) return null;
  const ms = new MiniSearchCtor({
    fields: ["title", "description", "tags", "aliases", "categories"],
    storeFields: ["id", "title", "description", "categories", "prompt", "priority", "globalUseCount"],
    searchOptions: { fuzzy: 0.2, prefix: true }
  });
  ms.addAll(docs);
  return ms;
}

function highlightText(text, query) {
  const q = norm(query);
  if (!q) return String(text || "");
  const base = String(text || "");
  const parts = q.split(/\s+/).filter(Boolean).slice(0, 5);
  let out = base;
  for (const p of parts) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "ig");
    out = out.replace(re, '<mark class="beta-hit">$1</mark>');
  }
  return out;
}

function initFeedbackCommandPalette() {
  const fab = document.getElementById("beta-fab");
  const panel = document.getElementById("beta-panel");
  const close = document.getElementById("beta-close");
  const search = document.getElementById("beta-search");
  const selected = document.getElementById("beta-selected");
  const notes = document.getElementById("beta-notes");
  const chars = document.getElementById("beta-charcount");
  const debugToggle = document.getElementById("beta-debug");
  const results = document.getElementById("beta-results");
  const moreBtn = document.getElementById("beta-more");
  const custom = document.getElementById("beta-custom");
  const cancel = document.getElementById("beta-cancel");
  const send = document.getElementById("beta-send");
  if (!fab || !panel || !search || !selected || !notes || !results || !send) return;

  let docs = [];
  let mini = null;
  let selectedSuggestion = null;
  let selectedIndex = 0;
  let displayCount = 5;
  let currentList = [];
  let searching = false;
  let debounce = null;
  let draftTimer = null;

  function track(name, extras = {}) {
    try { window.DashMsg?.logEvent?.(`feedback_${name}`, "Feedback", extras); } catch {}
  }

  async function loadSuggestions() {
    try {
      const r = await fetch("/suggestions.json", { cache: "force-cache" });
      if (!r.ok) throw new Error("suggestions_fetch_failed");
      const data = await r.json();
      docs = Array.isArray(data?.suggestions) ? data.suggestions : [];
      mini = buildMiniSearch(docs);
    } catch {
      docs = [];
      mini = null;
    }
  }

  function openPanel() {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    const draft = lsGet(LS_DRAFT, { search: "", notes: "", selectedId: null, debug: false });
    search.value = draft.search || "";
    notes.value = draft.notes || "";
    debugToggle.checked = !!draft.debug;
    selectedSuggestion = docs.find((d) => d.id === draft.selectedId) || null;
    selectedIndex = 0;
    displayCount = 5;
    renderSelected();
    refreshList();
    notes.style.height = "auto";
    notes.style.height = `${Math.min(notes.scrollHeight, 180)}px`;
    updateSendState();
    track("panel_open");
    setTimeout(() => search.focus(), 0);
  }

  function closePanel() {
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    track("panel_close");
  }

  function saveDraft() {
    lsSet(LS_DRAFT, {
      search: search.value,
      notes: notes.value,
      selectedId: selectedSuggestion?.id || null,
      debug: !!debugToggle.checked,
      ts: Date.now()
    });
  }

  function renderSelected() {
    if (!selectedSuggestion) {
      selected.className = "beta-selected empty";
      selected.innerHTML = "No suggestion selected yet.";
      return;
    }
    const cats = (selectedSuggestion.categories || []).map((c) => `<span class="beta-chip">${c}</span>`).join("");
    selected.className = "beta-selected";
    selected.innerHTML = `
      <div class="beta-item-title">${selectedSuggestion.title}</div>
      <div class="beta-item-desc">${selectedSuggestion.description || ""}</div>
      <div>${cats}</div>
      ${selectedSuggestion.prompt ? `<div class="beta-item-desc">${selectedSuggestion.prompt}</div>` : ""}
    `;
  }

  function defaultGroups(recents, sortedTop) {
    const groups = [];
    const recent = recents.map((id) => docs.find((d) => d.id === id)).filter(Boolean).slice(0, 5);
    if (recent.length) groups.push({ label: "Recent", items: recent });
    groups.push({ label: "Top suggestions", items: sortedTop.slice(0, 5) });

    const order = ["UI","Automation","Templates","Navigation","Performance","Notifications","Messages","Stores","Orders","General ideas"];
    for (const cat of order) {
      const items = docs.filter((d) => (d.categories || []).includes(cat)).slice(0, 3);
      if (items.length) groups.push({ label: cat, items });
    }
    return groups;
  }

  function runSearch(query, recents, pins) {
    if (!query) {
      const sortedTop = [...docs].sort((a,b)=> (boost(b, recents, pins) - boost(a, recents, pins)));
      const grouped = defaultGroups(recents, sortedTop);
      const flat = grouped.flatMap((g)=>g.items);
      return { grouped, flat, noMatch: false };
    }

    if (!mini) return { grouped: [], flat: [], noMatch: true };
    const hits = mini.search(query, { fuzzy: 0.2, prefix: true, combineWith: "AND" });
    const ranked = hits
      .map((h) => {
        const d = docs.find((x) => x.id === h.id);
        if (!d) return null;
        const score = Number(h.score || 0) + boost(d, recents, pins);
        return { d, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.d);
    return { grouped: [{ label: "Search", items: ranked }], flat: ranked, noMatch: ranked.length === 0 };
  }

  function rowHtml(item, query, idx, recents, pins) {
    const meta = pins.includes(item.id) ? "Pinned" : recents.includes(item.id) ? "Recent" : "";
    const cls = idx === selectedIndex ? "beta-item is-selected" : "beta-item";
    return `
      <div class="${cls}" data-id="${item.id}" role="option" aria-selected="${idx === selectedIndex}">
        <div>
          <div class="beta-item-title">${highlightText(item.title, query)}</div>
          <div class="beta-item-desc">${highlightText(item.description || "", query)}</div>
        </div>
        <div class="beta-item-meta">${meta}</div>
      </div>
    `;
  }

  function refreshList() {
    const recents = lsGet(LS_RECENT, []);
    const pins = lsGet(LS_PINS, []);
    const q = search.value.trim();
    const out = runSearch(q, recents, pins);
    currentList = out.flat;

    let rowIndex = 0;
    let html = "";
    for (const group of out.grouped) {
      if (rowIndex >= displayCount) break;
      const rows = [];
      for (const item of group.items) {
        if (rowIndex >= displayCount) break;
        rows.push(rowHtml(item, q, rowIndex, recents, pins));
        rowIndex++;
      }
      if (rows.length) {
        html += `<div class="beta-group">${group.label}</div>`;
        html += rows.join("");
      }
    }

    if (!html) html = `<div class="beta-item"><div><div class="beta-item-title">No matches</div><div class="beta-item-desc">Try another term.</div></div></div>`;
    results.innerHTML = html;

    moreBtn.hidden = out.flat.length <= displayCount;
    custom.hidden = !(out.noMatch && q.length > 1);
    custom.innerHTML = out.noMatch && q.length > 1 ? `Send as new suggestion: <strong>${q}</strong>` : "";

    if (selectedIndex >= out.flat.length) selectedIndex = 0;
    selectByIndex(selectedIndex);
    updateSendState();
  }

  function selectByIndex(i) {
    const els = [...results.querySelectorAll(".beta-item[data-id]")];
    if (!els.length) return;
    selectedIndex = Math.max(0, Math.min(i, els.length - 1));
    els.forEach((el, idx) => el.classList.toggle("is-selected", idx === selectedIndex));
    els[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }

  function selectSuggestion(id) {
    const found = docs.find((d) => d.id === id);
    if (!found) return;
    selectedSuggestion = found;
    const recents = lsGet(LS_RECENT, []);
    lsSet(LS_RECENT, [id, ...recents.filter((x) => x !== id)].slice(0, 5));
    renderSelected();
    updateSendState();
    saveDraft();
    track("suggestion_selected", { suggestion_id: id });
  }

  function updateSendState() {
    const n = notes.value.trim();
    const customText = search.value.trim();
    const canSend = !!selectedSuggestion || (!!customText && currentList.length === 0);
    send.disabled = !canSend || searching || (!n && !selectedSuggestion && !customText);
    chars.textContent = `${notes.value.length}/500`;
  }

  function detectDuplicate(payload) {
    const prev = lsGet(LS_LAST_SUBMISSIONS, []);
    const key = norm(`${payload.suggestion_title || ""} ${payload.custom_text || ""}`);
    const similar = prev.find((x) => Math.abs(Date.now() - x.ts) < 15 * 60 * 1000 && key.includes(x.key.slice(0, 20)));
    return !!similar;
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

  async function submitFeedback() {
    const query = search.value.trim();
    const noMatchCustom = !!query && currentList.length === 0;
    const payload = {
      suggestion_id: selectedSuggestion?.id || null,
      suggestion_title: selectedSuggestion?.title || null,
      custom_text: noMatchCustom ? query : "",
      notes: notes.value.trim(),
      route: location.pathname,
      screen: window.DashMsgUI?.currentScreen?.() || null,
      timestamp: Date.now(),
      app_version: window.DashMsg?.defaults?.()?.app_version || null,
      platform: navigator.platform || null,
      device: navigator.userAgent || null,
      browser: navigator.userAgent || null,
      debug_data: debugToggle.checked ? getFeedbackContext() : null,
      context: getFeedbackContext()
    };

    if (detectDuplicate(payload) && !confirm("Similar feedback was sent recently. Send again?")) return;

    searching = true;
    send.textContent = "Sending…";
    send.disabled = true;
    search.disabled = true;
    notes.disabled = true;

    const ok = await enqueueOrSend(payload);

    const prev = lsGet(LS_LAST_SUBMISSIONS, []);
    prev.unshift({ key: norm(`${payload.suggestion_title || ""} ${payload.custom_text || ""}`), ts: Date.now() });
    lsSet(LS_LAST_SUBMISSIONS, prev.slice(0, 20));

    notes.value = "";
    search.value = "";
    selectedSuggestion = null;
    lsSet(LS_DRAFT, { search: "", notes: "", selectedId: null, debug: debugToggle.checked, ts: Date.now() });
    renderSelected();
    refreshList();

    searching = false;
    send.textContent = "Send";
    search.disabled = false;
    notes.disabled = false;
    updateSendState();

    window.DashMsgUI?.toast?.(ok ? "Feedback sent" : "Queued for retry", true, "Saved");
    track("feedback_sent", { queued: !ok, suggestion_id: payload.suggestion_id, custom: !!payload.custom_text });
  }

  fab.onclick = () => (panel.hidden ? openPanel() : closePanel());
  close.onclick = closePanel;
  cancel.onclick = closePanel;

  document.addEventListener("pointerdown", (e) => {
    if (panel.hidden) return;
    if (panel.contains(e.target) || e.target === fab) return;
    closePanel();
  });

  search.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      displayCount = 5;
      refreshList();
      track("search_query", { q: search.value.trim().slice(0, 80) });
      saveDraft();
    }, 300);
  });

  notes.addEventListener("input", () => {
    if (notes.value.length > 500) notes.value = notes.value.slice(0, 500);
    notes.style.height = "auto";
    notes.style.height = `${Math.min(notes.scrollHeight, 180)}px`;
    updateSendState();
  });

  debugToggle.addEventListener("change", saveDraft);

  results.addEventListener("click", (e) => {
    const row = e.target.closest(".beta-item[data-id]");
    if (!row) return;
    selectSuggestion(row.dataset.id);
  });
  results.addEventListener("dblclick", (e) => {
    const row = e.target.closest(".beta-item[data-id]");
    if (!row) return;
    const pins = lsGet(LS_PINS, []);
    const id = row.dataset.id;
    const next = pins.includes(id) ? pins.filter((x) => x !== id) : [id, ...pins].slice(0, 12);
    lsSet(LS_PINS, next);
    refreshList();
  });


  moreBtn.addEventListener("click", () => {
    displayCount += 10;
    refreshList();
  });

  custom.addEventListener("click", () => {
    selectedSuggestion = null;
    renderSelected();
    updateSendState();
  });

  send.addEventListener("click", submitFeedback);

  panel.addEventListener("keydown", (e) => {
    if (panel.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closePanel(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); selectByIndex(selectedIndex + 1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); selectByIndex(selectedIndex - 1); return; }
    if (e.key === "Enter") {
      const item = currentList[selectedIndex];
      if (item) { e.preventDefault(); selectSuggestion(item.id); }
    }
  });

  draftTimer = setInterval(saveDraft, 1000);
  window.addEventListener("beforeunload", () => clearInterval(draftTimer));

  loadSuggestions().then(() => {
    renderSelected();
    refreshList();
  });
}


// public/app/ui.js — fixed (Home upper-left, Back only at bottom, no broken braces)

const DashMsgUI = (() => {
  const app = document.getElementById("app");
  let currentScreen = "main";
  let toastTimer = null;
  let lastActionType = null;

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
    lastActionType = action.type || null;

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
    lastAction: () => lastActionType,
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
