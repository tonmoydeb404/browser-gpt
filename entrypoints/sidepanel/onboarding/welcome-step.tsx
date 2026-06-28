import { BrainIcon, SparklesIcon } from "lucide-react";
import { motion } from "motion/react";

/* ---------- Step 0: Welcome ---------- */

export function WelcomeStep() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, -5, 5, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="flex size-24 items-center justify-center rounded-[2rem] bg-primary/10"
      >
        <BrainIcon className="size-14 text-primary" />
      </motion.div>

      <div className="space-y-2 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-bold tracking-tight"
        >
          Welcome to Browser GPT
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mx-auto max-w-[16rem] text-sm text-muted-foreground"
        >
          Your AI sidekick for the web. Chat about any page, then take control
          with Agent mode.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-4 rounded-lg bg-muted/40 px-4 py-2.5"
      >
        <Feature icon={SparklesIcon} label="Page-aware chat" />
        <div className="h-4 w-px bg-border" />
        <Feature icon={BrainIcon} label="Agent mode" />
      </motion.div>
    </div>
  );
}

function Feature({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3.5 text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
