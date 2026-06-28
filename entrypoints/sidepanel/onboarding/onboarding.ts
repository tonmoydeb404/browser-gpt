/**
 * Onboarding state — tracks whether the user completed or skipped the wizard.
 * Mirrors the chrome.storage.local pattern from lib/settings.ts.
 */

import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";

export interface OnboardingState {
  completed: boolean;
  skipped: boolean;
}

export const DEFAULT_ONBOARDING: OnboardingState = {
  completed: false,
  skipped: false,
};

const STORAGE_KEY = "browser-gpt-onboarding";

export async function loadOnboarding(): Promise<OnboardingState> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return {
    ...DEFAULT_ONBOARDING,
    ...((stored[STORAGE_KEY] as OnboardingState) ?? {}),
  };
}

export async function saveOnboarding(
  patch: Partial<OnboardingState>,
): Promise<OnboardingState> {
  const current = await loadOnboarding();
  const next = { ...current, ...patch };
  await browser.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

/**
 * React hook that subscribes to onboarding state in chrome.storage.
 */
export function useOnboarding(): {
  state: OnboardingState;
  isLoading: boolean;
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
  onReset: () => Promise<void>;
} {
  const [onboarding, setOnboarding] =
    useState<OnboardingState>(DEFAULT_ONBOARDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let done = false;
    const finish = (s?: OnboardingState) => {
      if (done) return;
      done = true;
      if (s) setOnboarding(s);
      setLoading(false);
    };

    loadOnboarding()
      .then((s) => finish(s))
      .catch(() => finish());

    const timeout = setTimeout(() => finish(), 1500);

    const listener = (
      changes: { [key: string]: Browser.storage.StorageChange },
      area: string,
    ) => {
      if (area === "local" && changes[STORAGE_KEY]) {
        setOnboarding({
          ...DEFAULT_ONBOARDING,
          ...((changes[STORAGE_KEY].newValue as OnboardingState) ?? {}),
        });
      }
    };
    browser.storage.onChanged.addListener(listener);

    return () => {
      clearTimeout(timeout);
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  const complete = useCallback(async () => {
    await saveOnboarding({ completed: true, skipped: false });
  }, []);

  const skip = useCallback(async () => {
    await saveOnboarding({ skipped: true });
  }, []);

  const reset = useCallback(async () => {
    await saveOnboarding(DEFAULT_ONBOARDING);
  }, []);

  return {
    state: onboarding,
    isLoading: loading,
    onComplete: complete,
    onSkip: skip,
    onReset: reset,
  };
}
