import type { AgentProfile, AgentProfileId } from "./types";

const PROFILES: Record<AgentProfileId, AgentProfile> = {
  default: {
    id: "default",
    command: null,
    label: "Agent",
    description: "General-purpose browser agent",
    systemPrompt:
      "\n\nYou are in Agent mode. You have tools to interact with web pages " +
      "and browser tabs. Use your tools proactively when they would help. " +
      "Be transparent about what you are doing.",
    maxSteps: 6,
  },
  research: {
    id: "research",
    command: "research",
    label: "/research",
    description: "Search the web and synthesize findings with citations",
    systemPrompt:
      "\n\nYou are a web research agent. Search the web for relevant " +
      "information, read the most promising pages, and synthesize your " +
      "findings. Always cite your sources.",
    maxSteps: 10,
  },
  fill: {
    id: "fill",
    command: "fill",
    label: "/fill",
    description: "Detect and fill form fields from instructions",
    skipPageContext: true,
    systemPrompt:
      "\n\nYou are a form-filling assistant. Your job is to fill and submit " +
      "forms on the current page based on the user's instructions. " +
      "\n\nWorkflow:" +
      "\n1. Call list_form_fields to see what's on the page." +
      "\n2. If the user's prompt already provides all needed values, fill " +
      "every relevant field immediately and submit — do not ask for " +
      "confirmation." +
      "\n3. If any required information is missing, use ask_user to ask " +
      "for ONLY the missing values. Do not re-ask for values the user " +
      "already provided." +
      "\n4. Fill all fields, then call submit_form. Do NOT ask the user " +
      "before submitting — the user invoked /fill specifically to have " +
      "you do this." +
      "\n\nThese tools are ONLY available in /fill mode, so you can safely " +
      "fill and submit without extra confirmation.",
    maxSteps: 10,
  },
  explore: {
    id: "explore",
    command: "explore",
    label: "/explore",
    description: "Navigate a website and map its structure",
    systemPrompt:
      "\n\nYou are a site exploration agent. Navigate links, read pages, " +
      "and map the website's structure. Report your findings clearly.",
    maxSteps: 12,
  },
  tabs: {
    id: "tabs",
    command: "tabs",
    label: "/tabs",
    description: "List and group open tabs by topic",
    skipPageContext: true,
    systemPrompt:
      "\n\nYou are a tab management agent. List open tabs, propose logical " +
      "groupings, and apply them immediately. Do NOT ask for confirmation " +
      "before grouping — the user invoked /tabs specifically to have you " +
      "organize their tabs. If the grouping is ambiguous or there are " +
      "multiple reasonable options, use ask_user to clarify briefly.",
    maxSteps: 4,
  },
  act: {
    id: "act",
    command: "act",
    label: "/act",
    description: "Click, scroll, and interact with the page",
    systemPrompt:
      "\n\nYou are a page interaction agent. You can read elements, scroll, " +
      "and click on the current page. Ask before performing clicks.",
    maxSteps: 8,
  },
  index: {
    id: "index",
    command: "index",
    label: "/index",
    description: "Re-index the current page (refresh RAG cache)",
    skipPageContext: true,
    systemPrompt: "",
    maxSteps: 1,
  },
};

export function getProfile(id: AgentProfileId): AgentProfile {
  return PROFILES[id] ?? PROFILES.default;
}

export function getProfileByCommand(cmd: string): AgentProfile | undefined {
  return Object.values(PROFILES).find((p) => p.command === cmd);
}

export function getSlashCommands(): AgentProfile[] {
  return Object.values(PROFILES).filter((p) => p.command !== null);
}

/**
 * Parse a slash command from the beginning of `text`.
 * Returns the resolved profile id and the remaining message text, or null
 * if no slash command is found.
 */
export function parseSlashCommand(
  text: string,
): { profile: AgentProfileId; text: string } | null {
  const match = text.match(/^\/(\w+)(?:\s+([\s\S]*))?$/);
  if (!match) return null;

  const profile = getProfileByCommand(match[1]);
  if (!profile) return null;

  return { profile: profile.id, text: (match[2] ?? "").trim() };
}
