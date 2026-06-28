import { useModels } from "@/contexts/config/hooks/openrouter";
import { useSettings } from "@/contexts/config/hooks/settings";
import { useMemo, type ReactNode } from "react";
import { ConfigContext, type ConfigContextValue } from "./core";

export function ConfigProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const models = useModels();

  const value = useMemo<ConfigContextValue>(() => {
    const currentModel =
      settings.value.model !== null
        ? (models.data.find((m) => m.id === settings.value.model) ?? null)
        : null;
    return {
      settings: {
        value: settings.value,
        isLoading: settings.loading,
        update: settings.update,
        isModalOpen: settings.isSettingsDialogOpen,
        onModalOpen: () => settings.setIsSettingsDialogOpen(true),
        onModalClose: () => settings.setIsSettingsDialogOpen(false),
      },
      model: {
        value: currentModel,
        update: (id: string) => settings.update({ model: id }),
        isModalOpen: settings.isModelSelectorOpen,
        list: models.data,
        isLoading: models.isLoading,
        onModalOpen: () => settings.setIsModelSelectorOpen(true),
        onModalClose: () => settings.setIsModelSelectorOpen(false),
      },
    };
  }, [settings, models]);

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}
