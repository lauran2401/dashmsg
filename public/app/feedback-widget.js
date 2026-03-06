// public/app/feedback-widget.js

const FEEDBACK_DRAFT_KEY = "dashmsg_feedback_draft_v3";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function mountFeedbackWidget({
  mount = document.body,
  onSubmit = async (payload) => {
    console.log("Feedback submit", payload);
    return { ok: true };
  }
} = {}) {
  let isOpen = false;
  let selectedType = "feedback";
  let messageText = "";
  let screenshotFile = null;
  let screenshotName = "";

  const TYPE_META = {
    feedback: {
      label: "Feedback",
      placeholder: "What are your thoughts?"
    },
    suggestion: {
      label: "Suggestion",
      placeholder: "What would you like to improve?"
    },
    bug: {
      label: "Report bug",
      placeholder: "What happened?"
    },
    feature: {
      label: "Request feature",
      placeholder: "What feature would you like?"
    }
  };

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
  header.append(title, closeBtn);

  const typeRow = el("div", "fb-types");
  const typeButtons = {};

  Object.entries(TYPE_META).forEach(([key, meta]) => {
    const btn = el("button", "fb-type", meta.label);
    btn.type = "button";
    btn.dataset.type = key;
    btn.addEventListener("click", () => {
      selectedType = key;
      renderTypeState();
      persistDraft();
      message.focus();
    });
    typeButtons[key] = btn;
    typeRow.appendChild(btn);
  });

  const message = el("textarea", "fb-message");
  message.id = "fb-message";
  message.rows = 4;
  message.placeholder = TYPE_META[selectedType].placeholder;
  message.addEventListener("input", () => {
    messageText = message.value;
    persistDraft();
    updateSendState();
  });
  // --- compose mode handling (mobile keyboard safe layout)

function enterComposeMode() {
  root.classList.add("fb-compose-mode");
}

function exitComposeMode() {
  root.classList.remove("fb-compose-mode");
}

message.addEventListener("focus", () => {
  enterComposeMode();
});

message.addEventListener("blur", () => {
  // small delay prevents flicker if user taps send
  setTimeout(() => {
    if (!message.matches(":focus")) exitComposeMode();
  }, 100);
});
  const attachRow = el("div", "fb-attach-row");

  const attachLabel = el("label", "fb-attach-btn");
  attachLabel.setAttribute("for", "fb-screenshot");
  attachLabel.textContent = "📎 Attach screenshot";

  const fileInput = el("input", "fb-file-input");
  fileInput.type = "file";
  fileInput.id = "fb-screenshot";
  fileInput.accept = "image/*";
  fileInput.addEventListener("change", () => {
    screenshotFile = fileInput.files?.[0] || null;
    screenshotName = screenshotFile ? screenshotFile.name : "";
    renderScreenshotState();
    persistDraft();
  });

  const screenshotMeta = el("div", "fb-screenshot-meta");

  attachRow.append(attachLabel, fileInput, screenshotMeta);

  const footer = el("div", "fb-footer");
  const sendBtn = el("button", "fb-submit", "Send");
  sendBtn.type = "button";
  sendBtn.disabled = true;
  sendBtn.addEventListener("click", handleSubmit);
  footer.append(sendBtn);

  panel.append(header, typeRow, message, attachRow, footer);
  root.append(fab, panel);
  mount.append(root);

  fab.addEventListener("click", () => {
    isOpen = !isOpen;
    renderOpenState();
    if (isOpen) message.focus();
  });

  closeBtn.addEventListener("click", () => {
    isOpen = false;
    renderOpenState();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      isOpen = false;
      renderOpenState();
    }
  });

  function persistDraft() {
    const hasAnything = !!(
      selectedType ||
      String(messageText || "").trim() ||
      screenshotName
    );

    if (!hasAnything) {
      clearDraft();
      return;
    }

    saveDraft({
      selectedType,
      messageText,
      screenshotName
    });
  }

  function restoreDraft() {
    const draft = loadDraft();
    if (!draft) return;
    selectedType = draft.selectedType || "feedback";
    messageText = draft.messageText || "";
    screenshotName = draft.screenshotName || "";
  }

  function renderOpenState() {
    panel.hidden = !isOpen;
    root.classList.toggle("fb-open", isOpen);
  }

  function renderTypeState() {
    Object.entries(typeButtons).forEach(([key, btn]) => {
      btn.classList.toggle("active", key === selectedType);
    });
    message.placeholder = TYPE_META[selectedType].placeholder;
  }

  function renderScreenshotState() {
    screenshotMeta.textContent = screenshotName ? `Attached: ${screenshotName}` : "";
    screenshotMeta.hidden = !screenshotName;
  }

  function updateSendState() {
    sendBtn.disabled = String(message.value || "").trim().length < 5;
  }

  async function handleSubmit() {
    const trimmed = String(message.value || "").trim();
    if (trimmed.length < 5) return;

    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";

    let screenshotDataUrl = null;
    if (screenshotFile) {
      try {
        screenshotDataUrl = await fileToDataUrl(screenshotFile);
      } catch {
        screenshotDataUrl = null;
      }
    }

    const payload = {
      type: selectedType,
      message: trimmed,
      screenshot: screenshotDataUrl,
      screenshot_name: screenshotName || null,
      context: {
        url: location.href,
        screen: window.DashMsgUI?.currentScreen?.() || null,
        app_version: window.DashMsg?.defaults?.()?.app_version || null,
        tester_id: localStorage.getItem("dashmsg_tester_id") || null,
        timestamp: Date.now()
      }
    };

    try {
      await onSubmit(payload);

      selectedType = "feedback";
      messageText = "";
      screenshotFile = null;
      screenshotName = "";
      fileInput.value = "";
      message.value = "";
      clearDraft();
      renderTypeState();
      renderScreenshotState();
      updateSendState();
      isOpen = false;
      renderOpenState();
    } finally {
      sendBtn.textContent = "Send";
      updateSendState();
    }
  }

  restoreDraft();
  message.value = messageText;
  renderTypeState();
  renderScreenshotState();
  updateSendState();
  renderOpenState();

  return {
    open() {
      isOpen = true;
      renderOpenState();
      message.focus();
    },
    close() {
      isOpen = false;
      renderOpenState();
    }
  };
}