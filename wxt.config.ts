import tailwindcss from "@tailwindcss/vite";
import { createRequire } from "node:module";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import path from "node:path";
import { defineConfig } from "wxt";
import type { Plugin } from "vite";

/**
 * Vite plugin that copies onnxruntime-web WASM glue files (.mjs + .wasm) into
 * public/ort-wasm/ so they are served from the extension's own origin ('self').
 *
 * MV3 CSP blocks loading scripts from CDNs, so ORT's dynamic import() of its
 * .mjs glue files must resolve to local files bundled in the extension.
 */
function copyOrtWasm(): Plugin {
  return {
    name: "copy-ort-wasm",
    buildStart() {
      try {
        const req = createRequire(import.meta.url);
        const tfEntry = req.resolve("@huggingface/transformers");
        const reqFromTf = createRequire(tfEntry);
        const ortEntry = reqFromTf.resolve("onnxruntime-web");
        const ortDist = dirname(ortEntry);
        if (!existsSync(ortDist)) return;

        const destDir = join(process.cwd(), "public", "ort-wasm");
        mkdirSync(destDir, { recursive: true });

        for (const f of readdirSync(ortDist)) {
          if (f === "ort-wasm-simd-threaded.asyncify.mjs" || f === "ort-wasm-simd-threaded.asyncify.wasm") {
            copyFileSync(join(ortDist, f), join(destDir, f));
          }
        }
      } catch (e) {
        this.warn(`Could not copy ORT WASM files: ${e}`);
      }
    },
  };
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Browser GPT",
    description: "Chat with AI about any tab in your browser sidebar",
    permissions: ["sidePanel", "scripting", "activeTab", "storage", "tabs"],
    host_permissions: ["<all_urls>"],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
    side_panel: {
      default_path: "sidepanel.html",
    },
    action: {
      default_title: "Open Browser GPT",
    },
  },
  vite: () => ({
    plugins: [tailwindcss(), copyOrtWasm()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"), // or "./src" if using src directory
      },
    },
  }),
});
