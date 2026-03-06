// public/app/feedback-widget.js

const FEEDBACK_RECENTS_KEY = "dashmsg_feedback_recents_v1";
const FEEDBACK_DRAFT_KEY = "dashmsg_feedback_draft_v1";

const FEEDBACK_SUGGESTIONS = [
  {
    id: "rename_template",
    title: "Rename template",
    aliases: ["change template name", "edit template title", "rename message"],
    tags: ["rename", "template", "label", "name", "title"],
    schema: {
      title: "Rename template",
      fields: [
        { key: "currentName", label: "Current template name", type: "text", required: true },
        { key: "newName", label: "New template name", type: "text", required: true }
      ]
    }
  },
  {
    id: "reorder_menu_items",
    title: "Reorder menu items",
    aliases: ["change menu order", "move menu item", "rearrange menu"],
    tags: ["menu", "order", "reorder", "move", "navigation"],
    schema: {
      title: "Reorder menu items",
      fields: [
        { key: "menuName", label: "Which menu?", type: "text", required: true },
        { key: "itemName", label: "Which item?", type: "text", required: true },
        { key: "desiredOrder", label: "What should change?", type: "textarea", required: true }
      ]
    }
  },
  {
    id: "too_many_taps",
    title: "Too many taps",
    aliases: ["too many clicks", "too many steps", "takes too long", "too much tapping"],
    tags: ["friction", "steps", "clicks", "taps", "slow"],
    schema: {
      title: "Too many taps",
      fields: [
        { key: "task", label: "What were you trying to do?", type: "text", required: true },
        { key: "where", label: "Where did it feel too long?", type: "text", required: false },
        { key: "details", label: "What would be better?", type: "textarea", required: false }
      ]
    }
  },
  {
    id: "wrong_message_sent",
    title: "Wrong message sent",
    aliases: ["bad message", "incorrect message", "sent wrong text"],
    tags: ["message", "wrong", "bug", "template"],
    schema: {
      title: "Wrong message sent",
      fields: [
        { key: "sentMessage", label: "What message was sent?", type: "textarea", required: true },
        { key: "expectedMessage", label: "What should have happened?", type: "textarea", required: true }
      ]
    }
  },
  {
    id: "add_feature",
    title: "Add new feature",
    aliases: ["new feature", "feature request", "add capability"],
    tags: ["feature", "request", "idea", "new"],
    schema: {
      title: "Add new feature",
      fields: [
        { key: "idea", label: "What feature do you want?", type: "textarea", required: true },
        { key: "why", label: "Why would this help?", type: "textarea", required: true }
      ]
    }
  }
];

function normalize(str) {
  return (str || "").toLowerCase().trim();
}

function scoreSuggestion(s, query) {
  const q = normalize(query);
  if (!q) return 0;

  const title = normalize(s.title);
  const aliases = (s.aliases || []).map(normalize);
  const tags = (s.tags || []).map(normalize);

  let score = 0;

  if (title === q) score += 100;
  if (title.startsWith(q)) score += 60;
  if (title.includes(q)) score += 40;

  for (const a of aliases) {
    if (a === q) score += 50;
    else if (a.startsWith(q)) score += 30;
    else if (a.includes(q)) score += 20;
  }

  for (const t of tags) {
    if (t === q) score += 25;
    else if (t.includes(q)) score += 10;
  }

  // crude fuzzy help
  const words = q.split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (title.includes(w)) score += 8;
    for (const a of aliases) if (a.includes(w)) score += 5;
    for (const t of tags) if (t.includes(w)) score += 3;
  }

  return score;
}

function getRecentIds() {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_RECENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentId(id) {
  const current = getRecentIds().filter(x => x !== id);
  current.unshift(id);
  localStorage.setItem(FEEDBACK_RECENTS_KEY, JSON.stringify(current.slice(0, 5)));
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_DRAFT_KEY) || "null");
  } catch {
    return null;
  }
}

function saveDraft(draft) {
  localStorage.setItem(FEEDBACK_DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
  localStorage.removeItem(FEEDBACK_DRAFT_KEY);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function mountFeedbackWidget({
  mount = document.body,
  onSubmit = async (payload) => {
    console.log("Feedback submit", payload);
    return { ok: true };
  }
} = {}) {
  let isOpen = false;
  let query = "";
  let selected = null;
  let draftFields = {};
  let expandedSuggestions = false;

  const root = el("div", "fb-root");
  const fab = el("button", "fb-fab");
  fab.type = "button";
  fab.title = "Feedback";
  fab.setAttribute("aria-label", "Open feedback");
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 12.5z"/>
    </svg>
  `;

  const panel = el("div", "fb-panel");
  panel.hidden = true;

  const header = el("div", "fb-header");
  const title = el("div", "fb-title", "Feedback");
  const closeBtn = el("button", "fb-close", "×");
  closeBtn.type = "button";
  closeBtn.title = "Close";
  closeBtn.setAttribute("aria-label", "Close feedback");

  const searchWrap = el("div", "fb-search-wrap");
  const search = el("input", "fb-search");
  search.type = "text";
  search.placeholder = "What do you want to change?";
  search.autocomplete = "off";
  search.spellcheck = false;

  const clearBtn = el("button", "fb-clear", "×");
  clearBtn.type = "button";
  clearBtn.title = "Clear";
  clearBtn.setAttribute("aria-label", "Clear search");

  const recentsWrap = el("div", "fb-recents");
  const resultsWrap = el("div", "fb-results");
  const selectedWrap = el("div", "fb-selected");
  const formWrap = el("form", "fb-form");
  const footer = el("div", "fb-footer");
  const submitBtn = el("button", "fb-submit", "Send");
  submitBtn.type = "submit";

  header.append(title, closeBtn);
  searchWrap.append(search, clearBtn);
  footer.append(submitBtn);
  formWrap.addEventListener("submit", handleSubmit);
  panel.append(header, searchWrap, recentsWrap, resultsWrap, selectedWrap, formWrap, footer);
  root.append(fab, panel);
  mount.append(root);

  fab.addEventListener("click", () => {
    isOpen = !isOpen;
    render();
    if (isOpen) search.focus();
  });

  closeBtn.addEventListener("click", () => {
    isOpen = false;
    render();
  });

  clearBtn.addEventListener("click", () => {
    query = "";
    expandedSuggestions = false;
    render();
    search.focus();
  });

  search.addEventListener("input", () => {
    query = search.value;
    selected = null;
    draftFields = {};
    expandedSuggestions = false;
    persistDraft();
    render();
  });

  function persistDraft() {
    saveDraft({
      query,
      selectedId: selected?.id || null,
      draftFields
    });
  }

  function restoreDraft() {
    const draft = loadDraft();
    if (!draft) return;
    query = draft.query || "";
    selected = FEEDBACK_SUGGESTIONS.find(x => x.id === draft.selectedId) || null;
    draftFields = draft.draftFields || {};
  }

  function getRecentSuggestions() {
    const ids = getRecentIds();
    return ids
      .map(id => FEEDBACK_SUGGESTIONS.find(s => s.id === id))
      .filter(Boolean)
      .slice(0, 5);
  }

  function getMatches() {
    const q = normalize(query);
    if (!q) return [];
    return FEEDBACK_SUGGESTIONS
      .map(s => ({ s, score: scoreSuggestion(s, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.s);
  }

  function renderRecents() {
    recentsWrap.innerHTML = "";
    if (query.trim()) return;

    const recents = getRecentSuggestions();
    if (!recents.length) return;

    const row = el("div", "fb-chip-row");
    recents.forEach(item => {
      const chip = el("button", "fb-chip", item.title);
      chip.type = "button";
      chip.addEventListener("click", () => {
        selected = item;
        query = item.title;
        draftFields = {};
        persistDraft();
        render();
      });
      row.appendChild(chip);
    });
    recentsWrap.appendChild(row);
  }

  function renderResults() {
    resultsWrap.innerHTML = "";
    if (!query.trim()) return;

    const matches = getMatches();
    const visible = expandedSuggestions ? matches : matches.slice(0, 5);

    if (!matches.length) {
      const addBtn = el("button", "fb-result fb-add", "＋ Add new feedback");
      addBtn.type = "button";
      addBtn.addEventListener("click", () => {
        selected = {
          id: "custom_feedback",
          title: query.trim() || "New feedback",
          schema: {
            title: "Add new feedback",
            fields: [
              { key: "change", label: "What do you want to change?", type: "textarea", required: true },
              { key: "why", label: "Why would this help?", type: "textarea", required: false }
            ]
          }
        };
        draftFields = { change: query.trim() };
        persistDraft();
        render();
      });
      resultsWrap.appendChild(addBtn);
      return;
    }

    visible.forEach(item => {
      const btn = el("button", "fb-result", item.title);
      btn.type = "button";
      btn.addEventListener("click", () => {
        selected = item;
        query = item.title;
        draftFields = {};
        persistDraft();
        render();
      });
      resultsWrap.appendChild(btn);
    });

    if (matches.length > 5 && !expandedSuggestions) {
      const more = el("button", "fb-more", "Show more");
      more.type = "button";
      more.addEventListener("click", () => {
        expandedSuggestions = true;
        render();
      });
      resultsWrap.appendChild(more);
    }
  }

  function renderSelected() {
    selectedWrap.innerHTML = "";
    if (!selected) return;

    const chip = el("div", "fb-selected-chip");
    const label = el("span", "fb-selected-text", selected.title);
    const remove = el("button", "fb-selected-remove", "×");
    remove.type = "button";
    remove.title = "Clear selection";
    remove.addEventListener("click", () => {
      selected = null;
      draftFields = {};
      persistDraft();
      render();
      search.focus();
    });
    chip.append(label, remove);
    selectedWrap.appendChild(chip);
  }

  function renderForm() {
    formWrap.innerHTML = "";
    footer.hidden = true;
    if (!selected?.schema) return;

    const fields = selected.schema.fields || [];
    if (!fields.length) return;

    fields.forEach(field => {
      const group = el("div", "fb-field");
      const label = el("label", "fb-label", field.label);

      let input;
      if (field.type === "textarea") {
        input = el("textarea", "fb-input fb-textarea");
        input.rows = 3;
      } else {
        input = el("input", "fb-input");
        input.type = "text";
      }

      input.name = field.key;
      input.required = !!field.required;
      input.value = draftFields[field.key] || "";
      input.addEventListener("input", () => {
        draftFields[field.key] = input.value;
        persistDraft();
      });

      group.append(label, input);
      formWrap.appendChild(group);
    });

    footer.hidden = false;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected) return;

    const payload = {
      suggestionId: selected.id,
      suggestionTitle: selected.title,
      fields: { ...draftFields }
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      await onSubmit(payload);
      if (selected.id !== "custom_feedback") saveRecentId(selected.id);
      clearDraft();
      query = "";
      selected = null;
      draftFields = {};
      expandedSuggestions = false;
      isOpen = false;
      render();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send";
    }
  }

  function render() {
    panel.hidden = !isOpen;
    search.value = query;

    renderRecents();
    renderResults();
    renderSelected();
    renderForm();

    const hasAnything =
      query.trim() ||
      selected ||
      Object.keys(draftFields).length > 0 ||
      getRecentSuggestions().length;

    root.classList.toggle("fb-open", isOpen);
    root.classList.toggle("fb-has-content", !!hasAnything);
  }

  restoreDraft();
  render();

  return {
    open() {
      isOpen = true;
      render();
      search.focus();
    },
    close() {
      isOpen = false;
      render();
    }
  };
}