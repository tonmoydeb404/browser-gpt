import { browser } from "wxt/browser";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ToolContext } from "../types";

interface FormField {
  selector: string;
  tagName: string;
  type: string;
  label: string;
  value: string;
  name?: string;
  required: boolean;
}

interface ListFieldsResponse {
  ok: boolean;
  fields?: FormField[];
  error?: string;
}

interface SimpleResponse {
  ok: boolean;
  error?: string;
}

export function createFormTools(ctx: ToolContext): ToolSet {
  return {
    list_form_fields: tool({
      description:
        "List all fillable form fields on the current page. Returns each " +
        "field's label, type, current value, selector, and whether it's " +
        "required. Use this before filling fields.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep({
          label: "Detecting form fields",
          status: "running",
        });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:list-fields",
          })) as ListFieldsResponse;

          if (!response.ok || !response.fields) {
            ctx.emitStep({
              label: "Detecting form fields",
              status: "error",
              detail: response.error,
            });
            return `Failed: ${response.error ?? "unknown error"}`;
          }

          if (response.fields.length === 0) {
            ctx.emitStep({
              label: "Detecting form fields",
              status: "done",
              detail: "none found",
            });
            return "No form fields found on this page.";
          }

          ctx.emitStep({
            label: "Detecting form fields",
            status: "done",
            detail: `${response.fields.length} fields`,
          });

          return response.fields
            .map(
              (f, i) =>
                `${i + 1}. ${f.label} [${f.type || f.tagName}]` +
                ` selector="${f.selector}"` +
                ` value="${f.value}"` +
                (f.required ? " (required)" : ""),
            )
            .join("\n");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: "Detecting form fields",
            status: "error",
            detail: msg,
          });
          return `Error: ${msg}`;
        }
      },
    }),

    fill_form_field: tool({
      description:
        "Fill a single form field with a value. Use list_form_fields first " +
        "to get the correct selector. For checkboxes/radios, use 'true' or " +
        "'false' as the value.",
      inputSchema: z.object({
        selector: z
          .string()
          .describe("CSS selector for the form field to fill."),
        value: z
          .string()
          .describe("The value to set."),
      }),
      execute: async ({ selector, value }) => {
        ctx.emitStep({
          label: `Filling: ${selector}`,
          status: "running",
        });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:fill-field",
            selector,
            value,
          })) as SimpleResponse;

          if (!response.ok) {
            ctx.emitStep({
              label: `Filling: ${selector}`,
              status: "error",
              detail: response.error,
            });
            return `Fill failed: ${response.error ?? "unknown error"}`;
          }

          ctx.emitStep({
            label: `Filled field with: ${value.slice(0, 40)}`,
            status: "done",
          });
          return "Field filled successfully.";
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: `Filling: ${selector}`,
            status: "error",
            detail: msg,
          });
          return `Fill error: ${msg}`;
        }
      },
    }),

    submit_form: tool({
      description:
        "Submit a form on the current page. " +
        "Optionally specify a form or submit button by CSS selector; " +
        "otherwise the first form or submit button is used.",
      inputSchema: z.object({
        selector: z
          .string()
          .optional()
          .describe("CSS selector for the form or submit button."),
      }),
      execute: async ({ selector }) => {
        ctx.emitStep({
          label: "Submitting form",
          status: "running",
        });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:submit-form",
            selector,
          })) as SimpleResponse;

          if (!response.ok) {
            ctx.emitStep({
              label: "Submitting form",
              status: "error",
              detail: response.error,
            });
            return `Submit failed: ${response.error ?? "unknown error"}`;
          }

          ctx.emitStep({
            label: "Form submitted",
            status: "done",
          });
          return "Form submitted successfully.";
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: "Submitting form",
            status: "error",
            detail: msg,
          });
          return `Submit error: ${msg}`;
        }
      },
    }),
  };
}
