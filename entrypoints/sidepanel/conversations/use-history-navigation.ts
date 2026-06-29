import { useCallback, useRef } from "react";

/**
 * Terminal-style history navigation over a list of message texts.
 *
 * Uses refs internally (no re-renders) — the caller drives the UI update
 * by setting textarea state from the returned values.
 *
 * @param history Array of past message texts, oldest-first.
 */
export function useHistoryNavigation(history: string[]) {
  /** null = not navigating; otherwise index into `history`. */
  const indexRef = useRef<number | null>(null);
  /** The text that was in the box before navigation started. */
  const draftRef = useRef("");

  /**
   * Navigate to an older message.
   * @param currentText The current textarea value (saved as draft on first call).
   * @returns The message text to display, or null if already at the oldest.
   */
  const navigateUp = useCallback(
    (currentText: string): string | null => {
      if (history.length === 0) return null;

      if (indexRef.current === null) {
        draftRef.current = currentText;
        indexRef.current = history.length - 1;
        return history[indexRef.current] ?? null;
      }

      if (indexRef.current > 0) {
        indexRef.current -= 1;
        return history[indexRef.current] ?? null;
      }

      return null;
    },
    [history],
  );

  /**
   * Navigate to a newer message.
   * @returns The message text to display, the saved draft when exiting
   *          navigation, or null if not currently navigating.
   */
  const navigateDown = useCallback((): string | null => {
    if (indexRef.current === null) return null;

    if (indexRef.current < history.length - 1) {
      indexRef.current += 1;
      return history[indexRef.current] ?? null;
    }

    indexRef.current = null;
    return draftRef.current;
  }, [history]);

  /** Exit navigation mode (call on submit or when the user edits manually). */
  const reset = useCallback(() => {
    indexRef.current = null;
    draftRef.current = "";
  }, []);

  return { navigateUp, navigateDown, reset };
}
