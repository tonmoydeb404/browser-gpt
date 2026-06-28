import { useOnboarding } from "@/entrypoints/sidepanel/onboarding/onboarding";
import { Conversations } from "./conversations";
import { OnboardingWizard } from "./onboarding";

export default function App() {
  const onboarding = useOnboarding();

  // Onboarding wizard for first-time users
  if (
    !onboarding.isLoading &&
    !onboarding.state.completed &&
    !onboarding.state.skipped
  ) {
    return <OnboardingWizard />;
  }

  return <Conversations />;
}
