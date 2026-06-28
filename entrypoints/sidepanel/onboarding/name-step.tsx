import { Input } from "@/components/ui/input";
import { UserIcon } from "lucide-react";

/* ---------- Step 1: User Name ---------- */

export function NameStep({
  username,
  onChange,
  onSubmit,
}: {
  username: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <UserIcon className="size-8 text-primary" />
      </div>

      <div className="w-full max-w-xs space-y-3">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold">What should I call you?</h2>
          <p className="text-sm text-muted-foreground">
            This will be used to personalize your experience.
          </p>
        </div>

        <Input
          autoFocus
          placeholder="Your name"
          value={username}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSubmit) onSubmit();
          }}
          className="text-center"
        />
      </div>
    </div>
  );
}
