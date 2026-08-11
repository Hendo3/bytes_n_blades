(function (root) {
  "use strict";

  function emitValueEvents(input) {
    input.dispatchEvent(new root.Event("input", { bubbles: true }));
    input.dispatchEvent(new root.Event("change", { bubbles: true }));
  }

  function stepNumber(input, direction) {
    if (input.disabled || input.readOnly) return;
    direction > 0 ? input.stepUp() : input.stepDown();
    emitValueEvents(input);
  }

  function enhanceNumberInput(input) {
    if (!input || input.dataset.cyberStepper === "ready" || input.closest(".quantity-stepper, .cyber-stepper")) return;
    input.dataset.cyberStepper = "ready";

    const wrapper = input.ownerDocument.createElement("span");
    wrapper.className = "cyber-stepper";
    const decrease = input.ownerDocument.createElement("button");
    const increase = input.ownerDocument.createElement("button");
    decrease.type = increase.type = "button";
    decrease.className = "cyber-stepper__button cyber-stepper__button--down";
    increase.className = "cyber-stepper__button cyber-stepper__button--up";
    decrease.textContent = "−";
    increase.textContent = "+";

    const label = input.getAttribute("aria-label") || input.labels?.[0]?.textContent?.trim() || input.name || "value";
    decrease.setAttribute("aria-label", `Decrease ${label}`);
    increase.setAttribute("aria-label", `Increase ${label}`);

    input.before(wrapper);
    wrapper.append(decrease, input, increase);
    decrease.addEventListener("click", () => stepNumber(input, -1));
    increase.addEventListener("click", () => stepNumber(input, 1));
  }

  function enhance(rootNode) {
    if (!rootNode?.querySelectorAll) return;
    if (rootNode.matches?.('input[type="number"]')) enhanceNumberInput(rootNode);
    rootNode.querySelectorAll('input[type="number"]').forEach(enhanceNumberInput);
  }

  function boot(documentNode = root.document) {
    if (!documentNode || documentNode.documentElement.dataset.cyberControls === "ready") return;
    documentNode.documentElement.dataset.cyberControls = "ready";
    enhance(documentNode);
    if (root.MutationObserver) {
      const observer = new root.MutationObserver((records) => records.forEach((record) => {
        record.addedNodes.forEach((node) => enhance(node));
      }));
      observer.observe(documentNode.body || documentNode.documentElement, { childList: true, subtree: true });
    }
  }

  const api = { boot, enhance, enhanceNumberInput, stepNumber };
  root.CyberControls = api;
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", () => boot());
    else boot();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
