import { browser } from "wxt/browser";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { type DomContext } from "./dom-utils";
import { startDomPickerOnActiveTab, stopDomPickerOnActiveTab } from "./messaging";

export type { DomContext };

/**
 * A picked element with an id for chip removal.
 */
export interface DomSelection extends DomContext {
  id: string;
  pickedAt: number;
}

/** A picked element with an id for chip removal. */
export interface DomSelection extends DomContext {
  id: string;
  pickedAt: number;
}

export interface DomSelectionsApi {
  selections: DomSelection[];
  isPicking: boolean;
  startPicker: () => Promise<void>;
  stopPicker: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

/**
 * Manages DOM element selections for the current prompt.
 *
 * `startPicker` asks the background to inject the picker into the active tab;
 * results arrive asynchronously via `cs:dom-picked` runtime messages. Multi-select:
 * each click appends a chip; Esc or `stopPicker` ends the session.
 */
export function useDomSelections(): DomSelectionsApi {
  const [selections, setSelections] = useState<DomSelection[]>([]);
  const [isPicking, setIsPicking] = useState(false);

  useEffect(() => {
    const listener = (
      message: unknown,
      _sender: unknown,
      sendResponse: (response?: unknown) => void,
    ) => {
      if (typeof message !== "object" || message === null) return false;
      const type = (message as { type?: string }).type;

      if (type === "cs:dom-picked") {
        const ctx = (message as { context: DomContext }).context;
        if (ctx) {
          setSelections((prev) => [
            ...prev,
            { ...ctx, id: nanoid(), pickedAt: Date.now() },
          ]);
        }
        sendResponse({ ok: true });
        return false;
      }

      if (type === "cs:picker-cancelled") {
        setIsPicking(false);
        sendResponse({ ok: true });
        return false;
      }

      return false;
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  const startPicker = useCallback(async () => {
    setIsPicking(true);
    const res = await startDomPickerOnActiveTab();
    if (!res.ok) {
      setIsPicking(false);
      toast.error(res.error ?? "Could not start the element picker.");
    }
  }, []);

  const stopPicker = useCallback(() => {
    setIsPicking(false);
    void stopDomPickerOnActiveTab();
  }, []);

  const remove = useCallback(
    (id: string) => setSelections((prev) => prev.filter((s) => s.id !== id)),
    [],
  );

  const clear = useCallback(() => setSelections([]), []);

  return { selections, isPicking, startPicker, stopPicker, remove, clear };
}
