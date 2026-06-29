export type ChatMode = "chat" | "agent";

export type AgentProfileId =
  | "default"
  | "research"
  | "fill"
  | "explore"
  | "tabs"
  | "act"
  | "index";

export interface AgentProfile {
  id: AgentProfileId;
  /** Slash command keyword (without leading /). Null for the default profile. */
  command: string | null;
  /** Human-readable label shown in the popover. */
  label: string;
  /** Description shown in the popover. */
  description: string;
  /** Appended to SYSTEM_PROMPT_BASE when this profile is active. */
  systemPrompt: string;
  /** Maximum multi-step iterations for the tool loop. */
  maxSteps: number;
  /** When true, skip RAG indexing of the current page. */
  skipPageContext?: boolean;
}

export interface ConfirmRequest {
  id: string;
  action: string;
  description: string;
  details?: Record<string, unknown>;
}

export type ConfirmFn = (req: ConfirmRequest) => Promise<boolean>;

export interface AskRequest {
  id: string;
  question: string;
  placeholder?: string;
}

export type AskFn = (req: AskRequest) => Promise<string>;

export interface SitemapNode {
  id: string;
  url: string;
  title: string;
}

export interface SitemapEdge {
  source: string;
  target: string;
}

export interface SitemapData {
  nodes: SitemapNode[];
  edges: SitemapEdge[];
}

export interface ToolContext {
  confirm: ConfirmFn;
  ask: AskFn;
  emitStep: (step: AgentStepData) => void;
  emitSources: (sources: SourceCitation[]) => void;
  emitSitemap: (data: SitemapData) => void;
  emitImages: (images: ImageData[]) => void;
}

export interface AgentStepData {
  label: string;
  status: "running" | "done" | "error";
  detail?: string;
}

export interface SourceCitation {
  title: string;
  url: string;
  snippet?: string;
}

export interface ImageData {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}
