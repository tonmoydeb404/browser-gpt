import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { AgentProfileId, ToolContext } from "../types";
import { createExploreTools } from "./explore";
import { createFormTools } from "./forms";
import { createImageTools } from "./images";
import { createPageActionTools } from "./page-actions";
import { createResearchTools } from "./research";
import { createTabTools } from "./tabs";

function createSharedTools(ctx: ToolContext): ToolSet {
  return {
    ask_user: tool({
      description:
        "Ask the user a question and wait for their text response. " +
        "Use this when you need information that wasn't provided in the " +
        "original prompt. Do NOT ask about things the user already told you.",
      inputSchema: z.object({
        question: z
          .string()
          .describe("The question to ask the user."),
        placeholder: z
          .string()
          .optional()
          .describe("Placeholder text for the input field."),
      }),
      execute: async ({ question, placeholder }) => {
        const response = await ctx.ask({
          id: `ask-${Date.now()}`,
          question,
          placeholder,
        });
        return response;
      },
    }),
  };
}

export function buildAgentTools(
  profileId: AgentProfileId,
  ctx: ToolContext,
): ToolSet {
  const tools: ToolSet = {};

  Object.assign(tools, createSharedTools(ctx));
  // list_images is available to every agent profile so images can be
  // extracted in any query (no dedicated slash command required).
  Object.assign(tools, createImageTools(ctx));

  switch (profileId) {
    case "research":
    case "default":
      Object.assign(tools, createResearchTools(ctx));
      break;
    case "act":
      Object.assign(tools, createPageActionTools(ctx));
      break;
    case "fill":
      Object.assign(tools, createFormTools(ctx));
      break;
    case "explore":
      Object.assign(tools, createExploreTools(ctx));
      break;
    case "tabs":
      Object.assign(tools, createTabTools(ctx));
      break;
  }

  return tools;
}
