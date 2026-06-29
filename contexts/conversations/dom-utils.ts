/**
 * Shared DOM description helpers used by the content-script DOM bridge.
 *
 * These run inside the persistent content script, so they may use normal
 * imports and types. Both full-page extraction and element description share
 * the same Markdown walker. Future agent DOM tools (form detection/fill, link
 * extraction) reuse these too.
 */

import type { ImageData } from "./agents/types";

export interface PageContent {
  url: string;
  title: string;
  text: string;
  markdown: string;
  meta: Record<string, string>;
  images: ImageData[];
}

export interface DomContext {
  selector: string;
  tagName: string;
  role?: string;
  label: string;
  text: string;
  markdown: string;
  href?: string;
  rect: { x: number; y: number; w: number; h: number };
  pageUrl: string;
  pageTitle: string;
}

const MAX_TEXT = 4000;
const MAX_LABEL = 80;

const truncate = (s: string, max: number): string =>
  s.length > max ? s.slice(0, max) + "\u2026" : s;

/** Builds a reasonably stable CSS selector path for an element. */
export function buildSelector(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;
  while (
    node &&
    node !== document.body &&
    node !== document.documentElement &&
    depth < 6
  ) {
    const id = node.id;
    if (id && /^[A-Za-z][\w-]*$/.test(id)) {
      parts.unshift("#" + id);
      break;
    }
    const parent: HTMLElement | null = node.parentElement;
    const nodeName: string = node.nodeName;
    let part = nodeName.toLowerCase();
    if (parent) {
      const same = (Array.from(parent.children) as Element[]).filter(
        (c) => c.nodeName === nodeName,
      );
      if (same.length > 1) {
        part += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
      }
    }
    parts.unshift(part);
    node = parent;
    depth++;
  }
  return parts.join(" > ");
}

/** Derives a human label for an element (aria, associated label, heading…). */
export function deriveLabel(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria && aria.trim()) return truncate(aria.trim(), MAX_LABEL);

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const target = document.getElementById(labelledBy);
    if (target && target.textContent?.trim())
      return truncate(target.textContent.trim(), MAX_LABEL);
  }

  const tag = el.nodeName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    const id = el.id;
    if (id) {
      const label = document.querySelector('label[for="' + id + '"]');
      if (label && label.textContent?.trim())
        return truncate(label.textContent.trim(), MAX_LABEL);
    }
    const wrapping = el.closest("label");
    if (wrapping && wrapping.textContent?.trim())
      return truncate(wrapping.textContent.trim(), MAX_LABEL);
    const placeholder = (el as HTMLInputElement).placeholder;
    if (placeholder && placeholder.trim())
      return truncate(placeholder.trim(), MAX_LABEL);
    const name = el.getAttribute("name");
    if (name) return name;
  }

  const heading = el.querySelector("h1, h2, h3, h4");
  if (heading && heading.textContent?.trim())
    return truncate(heading.textContent.trim(), MAX_LABEL);

  const ownText = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (ownText) return truncate(ownText, MAX_LABEL);

  return tag;
}

/** Renders a node subtree as Markdown (mirrors the page extractor's walk). */
export function walkToMarkdown(node: Node): string {
  const elm = node as Element;
  const name = elm.nodeName?.toLowerCase();

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  if (
    name === "script" ||
    name === "style" ||
    name === "noscript" ||
    name === "svg" ||
    name === "template" ||
    (elm.getClientRects?.().length ?? 0) === 0
  ) {
    return "";
  }

  let out = "";
  let child = node.firstChild;
  while (child) {
    out += walkToMarkdown(child);
    child = child.nextSibling;
  }

  switch (name) {
    case "h1":
      return "\n\n# " + out.trim() + "\n\n";
    case "h2":
      return "\n\n## " + out.trim() + "\n\n";
    case "h3":
      return "\n\n### " + out.trim() + "\n\n";
    case "h4":
      return "\n\n#### " + out.trim() + "\n\n";
    case "li":
      return "- " + out.trim() + "\n";
    case "p":
    case "div":
    case "section":
    case "article":
    case "header":
    case "footer":
    case "main":
      return out.trim() ? "\n" + out.trim() + "\n" : "";
    case "a": {
      const href = elm.getAttribute("href");
      return href ? "[" + out.trim() + "](" + href + ")" : out;
    }
    case "code": {
      const pre = elm.closest("pre");
      return pre
        ? "\n```\n" + (elm.textContent ?? "") + "\n```\n"
        : "`" + out.trim() + "`";
    }
    case "blockquote":
      return out
        .trim()
        .split("\n")
        .map((l) => "> " + l)
        .join("\n");
    case "br":
      return "\n";
    default:
      return out;
  }
}

/** Captures a full DomContext snapshot for a picked element. */
export function describeElement(el: Element): DomContext {
  const r = el.getBoundingClientRect();
  const anchor = el as HTMLAnchorElement;
  const innerAnchor = el.querySelector("a") as HTMLAnchorElement | null;
  return {
    selector: buildSelector(el),
    tagName: el.nodeName,
    role: el.getAttribute("role") || undefined,
    label: deriveLabel(el),
    text: truncate(
      (el as HTMLElement).innerText || el.textContent || "",
      MAX_TEXT,
    ),
    markdown: walkToMarkdown(el).replace(/\n{3,}/g, "\n\n").trim(),
    href: anchor.href || innerAnchor?.href || undefined,
    rect: { x: r.left, y: r.top, w: r.width, h: r.height },
    pageUrl: location.href,
    pageTitle: document.title,
  };
}

/** Extracts the full page content (meta + text + Markdown) for chat/RAG. */
export function extractPageContent(): PageContent {
  const meta: Record<string, string> = {};
  document
    .querySelectorAll("meta[name], meta[property]")
    .forEach((el) => {
      const key = el.getAttribute("name") || el.getAttribute("property");
      const value = el.getAttribute("content");
      if (key && value) meta[key] = value;
    });

  return {
    url: location.href,
    title: document.title,
    text: document.body?.innerText ?? "",
    markdown: walkToMarkdown(document.body).replace(/\n{3,}/g, "\n\n").trim(),
    meta,
    images: extractImages(),
  };
}

const LAZY_SRC_ATTRS = ["data-src", "data-original", "data-lazy-src", "data-lazy"];

/**
 * Collects all visible <img> elements with their resolved source URL, alt
 * text, and intrinsic dimensions. Relative URLs are resolved against the
 * document and results are de-duplicated by source. Shared by page extraction
 * (`extractPageContent`) and the `list_images` agent tool.
 */
export function extractImages(): ImageData[] {
  const images: ImageData[] = [];
  const seen = new Set<string>();

  document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    let raw: string | null = null;

    // Prefer the browser-resolved source (handles srcset/picture).
    if (img.currentSrc) {
      raw = img.currentSrc;
    } else if (img.src && !img.src.startsWith("data:")) {
      raw = img.src;
    }

    // Fall back to lazy-loading attributes or the first srcset entry.
    if (!raw) {
      for (const attr of LAZY_SRC_ATTRS) {
        const v = img.getAttribute(attr);
        if (v) {
          raw = v;
          break;
        }
      }
    }
    if (!raw) {
      const srcset = img.getAttribute("srcset") || img.srcset || "";
      const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
      if (first) raw = first;
    }

    if (!raw) return;

    // Resolve relative URLs against the document.
    let resolved: string;
    try {
      resolved = new URL(raw, location.href).href;
    } catch {
      return;
    }

    // Keep only http(s), data:, and blob: sources.
    if (
      !resolved.startsWith("http:") &&
      !resolved.startsWith("https:") &&
      !resolved.startsWith("data:") &&
      !resolved.startsWith("blob:")
    ) {
      return;
    }

    if (seen.has(resolved)) return;
    seen.add(resolved);

    const alt = (img.alt || "").trim();
    images.push({
      src: resolved,
      alt: alt || undefined,
      width: img.naturalWidth || img.width || undefined,
      height: img.naturalHeight || img.height || undefined,
    });
  });

  return images;
}
