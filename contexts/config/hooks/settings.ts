import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

export interface Settings {
  username: string;
  apiKey: string;
  model: string | null;
  autoAttach: boolean;
  agentMode: boolean;
  maxAgentSteps: number;
}

export const DEFAULT_SETTINGS: Settings = {
  username: "",
  apiKey: "",
  model: null,
  autoAttach: true,
  agentMode: false,
  maxAgentSteps: 15,
};

const STORAGE_KEY = "browser-gpt-settings";

type SettingsChangeHandler = (settings: Settings) => void;

export async function loadSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...((stored[STORAGE_KEY] as Settings) ?? {}) };
}

export async function saveSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await browser.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export function onSettingsChange(handler: SettingsChangeHandler): () => void {
  const listener = (
    changes: { [key: string]: Browser.storage.StorageChange },
    area: string,
  ) => {
    if (area === "local" && changes[STORAGE_KEY]) {
      handler({
        ...DEFAULT_SETTINGS,
        ...((changes[STORAGE_KEY].newValue as Settings) ?? {}),
      });
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

/**
 * React hook that subscribes to settings in chrome.storage.
 */
export function useSettings(): {
  value: Settings;
  loading: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
  isSettingsDialogOpen: boolean;
  setIsSettingsDialogOpen: (open: boolean) => void;
  isModelSelectorOpen: boolean;
  setIsModelSelectorOpen: (open: boolean) => void;
} {
  const [value, setValue] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = (s?: Settings) => {
      if (done) return;
      done = true;
      if (s) setValue(s);
      setLoading(false);
    };

    loadSettings()
      .then(finish)
      .catch(() => finish());

    // Safety timeout: never stay in loading state forever
    const timeout = setTimeout(() => finish(), 1500);

    const unsub = onSettingsChange((s) => setValue(s));
    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  const update = async (patch: Partial<Settings>) => {
    const next = await saveSettings(patch);
    setValue(next);
  };

  return {
    value: value,
    loading,
    update,
    isSettingsDialogOpen,
    setIsSettingsDialogOpen,
    isModelSelectorOpen,
    setIsModelSelectorOpen,
  };
}
