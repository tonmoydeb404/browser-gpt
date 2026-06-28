/**
 * Page state extraction — injected into the active tab to build a structured
 * list of interactive elements the agent can reference by index.
 */

export interface InteractiveElement {
  index: number;
  role: string;
  tag: string;
  type: string;
  label: string;
  text: string;
  value: string;
  placeholder: string;
  href: string;
  checked: boolean;
  disabled: boolean;
}

export interface PageState {
  url: string;
  title: string;
  scrollY: number;
  scrollHeight: number;
  viewportHeight: number;
  elements: InteractiveElement[];
}

export interface BgPageStateResponse {
  ok: boolean;
  state?: PageState;
  error?: string;
}

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "textarea",
  "select",
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="textbox"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[contenteditable="true"]',
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/**
 * Injected into the page context via chrome.scripting.executeScript.
 * MUST be self-contained — no closure variables, no external references.
 * Returns a JSON-serializable PageState.
 */
export function extractPageState(): PageState {
  // Clear old markers from previous calls
  document.querySelectorAll("[data-bgpt-idx]").forEach((el) => {
    el.removeAttribute("data-bgpt-idx");
  });

  const elements: InteractiveElement[] = [];
  const nodes = document.querySelectorAll(INTERACTIVE_SELECTOR);
  let idx = 0;

  nodes.forEach((el) => {
    // Skip non-visible elements
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;

    // Skip if already tagged (avoids duplicates like <button role="button">)
    if (el.hasAttribute("data-bgpt-idx")) return;

    const tag = el.tagName.toLowerCase();
    const inputEl = el as HTMLInputElement;
    const type = inputEl.type || "";

    // Assign index marker
    const index = idx++;
    el.setAttribute("data-bgpt-idx", String(index));

    // Resolve accessible label
    let label = el.getAttribute("aria-label") || "";
    if (!label) {
      const labelledBy = el.getAttribute("aria-labelledby");
      if (labelledBy) {
        label =
          document.getElementById(labelledBy)?.textContent?.trim().slice(0, 80) ||
          "";
      }
    }
    if (!label && el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl) label = labelEl.textContent?.trim().slice(0, 80) || "";
    }
    if (!label && tag === "select") {
      const sel = el as HTMLSelectElement;
      label = sel.options[sel.selectedIndex]?.text?.trim() || "";
    }

    const placeholder = inputEl.placeholder || "";
    if (!label) label = placeholder;
    if (!label) label = el.getAttribute("title") || "";

    const text = (el.textContent || "").trim().slice(0, 100);

    elements.push({
      index,
      role: el.getAttribute("role") || tag,
      tag,
      type,
      label,
      text: text !== label ? text : "",
      value: inputEl.value || "",
      placeholder,
      href: el.getAttribute("href") || "",
      checked: inputEl.checked || false,
      disabled: inputEl.disabled || false,
    });
  });

  return {
    url: location.href,
    title: document.title,
    scrollY: Math.round(window.scrollY),
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    elements,
  };
}

/**
 * Format page state into a compact text representation for the model.
 * Designed to be token-efficient while providing enough context for action.
 */
export function formatPageState(state: PageState): string {
  const lines: string[] = [
    `PAGE: ${state.url} | "${state.title}"`,
    `SCROLL: ${state.scrollY}px of ${state.scrollHeight}px`,
    "",
  ];

  if (state.elements.length === 0) {
    lines.push("No interactive elements found on this page.");
    return lines.join("\n");
  }

  lines.push(`INTERACTIVE ELEMENTS (${state.elements.length}):`);

  for (const el of state.elements) {
    const parts: string[] = [`[${el.index}]`];

    // Role/type descriptor
    const descriptor = el.type
      ? `${el.role} ${el.type}`
      : el.role;
    parts.push(descriptor);

    // Label (quoted)
    if (el.label) parts.push(`"${el.label}"`);

    // Value
    if (el.value && el.tag === "input") parts.push(`value="${el.value.slice(0, 50)}"`);
    if (el.value && el.tag === "textarea") parts.push(`value="${el.value.slice(0, 50)}"`);
    if (el.value && el.tag === "select") parts.push(`value="${el.value}"`);

    // Checked state
    if (el.checked) parts.push("checked=true");

    // Disabled
    if (el.disabled) parts.push("disabled");

    // Link href
    if (el.href && el.href.startsWith("/"))
      parts.push(`-> ${el.href}`);
    else if (el.href && el.href.startsWith("http"))
      parts.push(`-> ${el.href.slice(0, 60)}`);

    // Text content (if different from label)
    if (el.text && el.text !== el.label)
      parts.push(`text="${el.text.slice(0, 60)}"`);

    lines.push(parts.join(" "));
  }

  return lines.join("\n");
}
