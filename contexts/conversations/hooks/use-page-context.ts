import { useCallback } from "react";
import { readActiveTabContent, type PageContent } from "../messaging";

export interface PageContextApi {
  /** Fetch the active tab's extracted content (markdown + text + meta). */
  fetchPageContent: () => Promise<PageContent>;
}

/**
 * Bridge to the background service worker's page reader.
 * Always reads fresh from the active tab (content may change between sends).
 */
export function usePageContext(): PageContextApi {
  const fetchPageContent = useCallback(() => readActiveTabContent(), []);
  return { fetchPageContent };
}
