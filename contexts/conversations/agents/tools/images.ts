import { browser } from "wxt/browser";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ImageData, ToolContext } from "../types";

interface ImageItem {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface ListImagesResponse {
  ok: boolean;
  images?: ImageItem[];
  error?: string;
}

export function createImageTools(ctx: ToolContext): ToolSet {
  return {
    list_images: tool({
      description:
        "List all images on the current page. Returns each image's " +
        "resolved source URL, alt text, and dimensions, and renders a " +
        "preview gallery for the user. Use this to answer questions about " +
        "the page's images based on their alt text.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep({ label: "Listing images", status: "running" });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:list-images",
          })) as ListImagesResponse;

          if (!response.ok || !response.images) {
            ctx.emitStep({
              label: "Listing images",
              status: "error",
              detail: response.error,
            });
            return `Failed: ${response.error ?? "unknown error"}`;
          }

          const images: ImageData[] = response.images.map((img) => ({
            src: img.src,
            alt: img.alt || undefined,
            width: img.width || undefined,
            height: img.height || undefined,
          }));

          ctx.emitImages(images);

          ctx.emitStep({
            label: "Listing images",
            status: "done",
            detail: `${images.length} images`,
          });

          if (images.length === 0) {
            return "No images found on this page.";
          }

          return images
            .map((img, i) => {
              const dims =
                img.width && img.height ? `${img.width}x${img.height}` : "?";
              const alt = img.alt ? `"${img.alt}"` : "(no alt text)";
              return `${i + 1}. [${dims}] ${alt}\n   ${img.src}`;
            })
            .join("\n\n");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: "Listing images",
            status: "error",
            detail: msg,
          });
          return `Error: ${msg}`;
        }
      },
    }),
  };
}
