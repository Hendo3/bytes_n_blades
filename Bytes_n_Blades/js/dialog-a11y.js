/**
 * BYTE & BLADES - ACCESSIBLE DIALOG CONTROLLER
 * Shared focus containment, Escape handling and focus restoration for overlays.
 */
(function (root) {
  const documentNode = root.document;
  const records = new WeakMap();
  const stack = [];
  const FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[contenteditable='true']",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  function available(element) {
    return Boolean(
      element
      && !element.hidden
      && element.getAttribute("aria-hidden") !== "true"
      && !element.closest("[hidden], .hidden")
      && !element.matches(":disabled"),
    );
  }

  function focusable(dialog) {
    if (!dialog?.querySelectorAll) return [];
    return Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(available);
  }

  function focus(element) {
    if (!element || typeof element.focus !== "function") return false;
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
    return true;
  }

  function topRecord() {
    const container = stack[stack.length - 1];
    return container ? records.get(container) : null;
  }

  function initialTarget(record) {
    const configured = typeof record.initialFocus === "string"
      ? record.dialog.querySelector(record.initialFocus)
      : record.initialFocus;
    return available(configured) ? configured : focusable(record.dialog)[0] || record.dialog;
  }

  function activate(container, options = {}) {
    if (!documentNode || !container) return null;
    if (records.has(container)) deactivate(container, { restoreFocus: false });

    const dialog = options.dialog
      || container.querySelector?.("[role='dialog'], [role='alertdialog']")
      || container;
    if (!dialog.hasAttribute("role")) dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    const managedTabindex = !dialog.hasAttribute("tabindex");
    if (managedTabindex) dialog.setAttribute("tabindex", "-1");

    const record = {
      container,
      dialog,
      initialFocus: options.initialFocus || null,
      onEscape: options.onEscape,
      returnFocus: options.returnFocus || documentNode.activeElement,
      managedTabindex,
      redirecting: false,
      keydown: null,
      focusin: null,
    };

    record.keydown = (event) => {
      if (topRecord() !== record) return;
      if (event.key === "Escape" && record.onEscape !== false) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof record.onEscape === "function") record.onEscape(event);
        return;
      }
      if (event.key !== "Tab") return;
      const candidates = focusable(dialog);
      if (candidates.length === 0) {
        event.preventDefault();
        focus(dialog);
        return;
      }
      const first = candidates[0];
      const last = candidates[candidates.length - 1];
      const active = documentNode.activeElement;
      if (!dialog.contains(active) || (event.shiftKey && active === first)) {
        event.preventDefault();
        focus(last);
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        focus(first);
      }
    };

    record.focusin = (event) => {
      if (topRecord() !== record || dialog.contains(event.target) || record.redirecting) return;
      record.redirecting = true;
      focus(initialTarget(record));
      record.redirecting = false;
    };

    records.set(container, record);
    stack.push(container);
    container.addEventListener("keydown", record.keydown);
    documentNode.addEventListener("focusin", record.focusin);
    documentNode.body?.classList.add("dialog-open");
    focus(initialTarget(record));
    return record;
  }

  function deactivate(container, options = {}) {
    const record = records.get(container);
    if (!record) return false;
    container.removeEventListener("keydown", record.keydown);
    documentNode?.removeEventListener("focusin", record.focusin);
    const index = stack.lastIndexOf(container);
    if (index >= 0) stack.splice(index, 1);
    records.delete(container);
    if (record.managedTabindex) record.dialog.removeAttribute("tabindex");
    if (stack.length === 0) documentNode?.body?.classList.remove("dialog-open");
    if (options.restoreFocus !== false && record.returnFocus?.isConnected) focus(record.returnFocus);
    return true;
  }

  function isActive(container) {
    return records.has(container);
  }

  const api = { activate, deactivate, focusable, isActive, focus };
  root.CyberDialogs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
