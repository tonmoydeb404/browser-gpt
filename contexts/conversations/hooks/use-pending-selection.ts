import { useEffect, useState } from "react";
import {
  clearPendingSelection,
  consumePendingSelection,
  onPendingSelection,
  type PendingSelection,
} from "../selection-store";

export interface PendingSelectionApi {
  selection: PendingSelection | null;
  clearSelection: () => void;
}

/**
 * Surfaces a context-menu text selection into the UI.
 *
 * Picks up a pending selection on mount (panel was closed, now opening) and
 * reacts to live changes (panel already open). The store entry is consumed on
 * pickup so it never re-surfaces on a later mount.
 */
export function usePendingSelection(): PendingSelectionApi {
  const [selection, setSelection] = useState<PendingSelection | null>(null);

  useEffect(() => {
    let cancelled = false;

    consumePendingSelection().then((s) => {
      if (!cancelled && s) setSelection(s);
    });

    const unsub = onPendingSelection((s) => {
      setSelection(s);
      void clearPendingSelection();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const clearSelection = () => setSelection(null);

  return { selection, clearSelection };
}
