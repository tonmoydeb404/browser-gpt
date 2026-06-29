import { Button } from "@/components/ui/button";
import { useConfig } from "@/contexts/config";
import { useOnboarding } from "@/entrypoints/sidepanel/onboarding/onboarding";
import { getEnvConfig } from "@/lib/env";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ApiKeyStep } from "./api-key-step";
import { ModelStep } from "./model-step";
import { NameStep } from "./name-step";
import { WelcomeStep } from "./welcome-step";

const TOTAL_STEPS = 4;

interface OnboardingWizardProps {}

const stepVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 24 : -24,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -24 : 24,
    opacity: 0,
  }),
};

export function OnboardingWizard({}: OnboardingWizardProps) {
  const { onComplete: complete, onSkip: onSkip } = useOnboarding();
  const { model, settings } = useConfig();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [username, setUsername] = useState(settings.value.username);
  const [apiKey, setApiKey] = useState(settings.value.apiKey);

  const envConfig = getEnvConfig();

  useEffect(() => {
    setUsername(envConfig.username ?? settings.value.username);
    setApiKey(envConfig.apiKey ?? settings.value.apiKey);
    if (envConfig.model) {
      model.update(envConfig.model);
    }
  }, [settings.value.username, settings.value.apiKey]);

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleFinish = async () => {
    await settings.update({
      username: username.trim(),
      apiKey: apiKey.trim(),
    });
    await complete();
  };

  const canAdvance = () => {
    if (step === 1) return username.trim().length > 0;
    if (step === 3) return !!model.value;
    return true;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Progress bar */}
      <div className="flex items-center gap-1.5 px-4 pt-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <motion.div
            key={i}
            className="h-1 rounded-full bg-primary"
            animate={{
              flex: i === step ? 4 : 1,
              opacity: i <= step ? 1 : 0.25,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 28 },
              opacity: { duration: 0.18 },
            }}
            className="flex flex-1 flex-col px-6"
          >
            {step === 0 && <WelcomeStep />}

            {step === 1 && (
              <NameStep
                username={username}
                onChange={setUsername}
                onSubmit={canAdvance() ? goNext : undefined}
              />
            )}

            {step === 2 && (
              <ApiKeyStep
                apiKey={apiKey}
                onChange={setApiKey}
                onSubmit={goNext}
              />
            )}

            {step === 3 && <ModelStep />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav buttons */}
      <div className="flex items-center gap-2 border-t border-border p-4">
        {step > 0 ? (
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeftIcon className="size-3.5" />
            Back
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
        )}

        <div className="ml-auto">
          {step < TOTAL_STEPS - 1 ? (
            <Button size="sm" onClick={goNext} disabled={!canAdvance()}>
              Next
              <ArrowRightIcon className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish} disabled={!canAdvance()}>
              <CheckIcon className="size-3.5" />
              Start
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
