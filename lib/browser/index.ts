/**
 * Browser agent module — assembles all browser-control tools and provides
 * the agent system prompt for multi-step page interaction.
 */

export { createBrowserTools } from "./tools";
export { getPageState, performAction } from "./messaging";
export { formatPageState, type PageState, type InteractiveElement } from "./page-state";
export {
  type ActionRequest,
  type ActionResult,
  type ActionType,
} from "./page-actions";
export { extractPageState } from "./page-state";
export { performPageAction } from "./page-actions";
export {
  navigateTo,
  goBack,
  goForward,
  reloadPage,
  openTab,
  closeTab,
  switchTab,
  listTabs,
  formatTabList,
  type TabInfo,
} from "./navigation";

/**
 * System prompt addition for agent mode.
 * Appended to the base system prompt when agentMode is enabled.
 */
export const AGENT_SYSTEM_PROMPT = `

## AGENT MODE — Browser Interaction

You can interact with web pages using tools. Follow this workflow:

1. **Observe**: Call get_page_state to see the page's interactive elements (each has an [index] number).
2. **Act**: Use click_element, type_text, select_option, press_key, scroll_page, or hover_element — referencing elements by their index.
3. **Navigate**: Use navigate_to, go_back, go_forward, or open_tab to move between pages. Use list_tabs and switch_tab to manage multiple tabs.
4. **Verify**: After important actions, call get_page_state again to check if the page changed as expected.
5. **Report**: When the task is complete (or blocked), summarize what you did.

### Rules
- Always call get_page_state first to understand the page before acting.
- One action per step, then observe the result.
- If an element is not found, call get_page_state to get the current element list.
- After navigation (navigate_to, go_back, open_tab, switch_tab), always call get_page_state to see the new page.
- If a page doesn't change after an action, the element may not have worked — try an alternative.

### Safety
- BEFORE submitting forms, making payments, deleting data, or navigating away, tell the user what you're about to do and wait for their confirmation in the next message.
- Never auto-submit forms or complete purchases without explicit user approval.
- If you're unsure whether an action is safe, ask first.`;
