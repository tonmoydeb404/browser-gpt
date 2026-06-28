import type { ModelOption } from "@/contexts/config/hooks/openrouter";
import type { Settings } from "@/contexts/config/hooks/settings";
import { createContext, useContext } from "react";

export interface SettingsGroup {
  value: Settings;
  isLoading: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
  onModalOpen: () => void;
  onModalClose: () => void;
  isModalOpen: boolean;
}

export interface ModelGroup {
  value: ModelOption | null;
  list: ModelOption[];
  isLoading: boolean;
  update: (id: string) => Promise<void>;
  isModalOpen: boolean;
  onModalOpen: () => void;
  onModalClose: () => void;
}

export interface ConfigContextValue {
  settings: SettingsGroup;
  model: ModelGroup;
}

export const ConfigContext = createContext<ConfigContextValue | null>(null);

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return ctx;
}
