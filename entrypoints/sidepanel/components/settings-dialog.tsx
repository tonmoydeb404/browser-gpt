import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useConfig } from "@/contexts/config";
import { useEffect, useState } from "react";

export const SettingsDialog = () => {
  const { settings } = useConfig();

  const [apiKeyDraft, setApiKeyDraft] = useState(settings.value.apiKey);
  const [usernameDraft, setUsernameDraft] = useState(settings.value.username);

  useEffect(() => {
    setApiKeyDraft(settings.value.apiKey);
    setUsernameDraft(settings.value.username);
  }, [settings.value.apiKey, settings.value.username]);

  const handleSave = async () => {
    await settings.update({
      apiKey: apiKeyDraft.trim(),
      username: usernameDraft.trim(),
    });
    settings.onModalClose();
  };

  return (
    <Dialog
      open={settings.isModalOpen}
      onOpenChange={(open) => {
        if (open) {
          settings.onModalOpen();
          setApiKeyDraft(settings.value.apiKey);
          setUsernameDraft(settings.value.username);
        } else {
          settings.onModalClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your OpenRouter API key and preferences. Your key is
            stored locally in this browser only.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="display-name" className="text-sm font-medium">
              Display Name
            </label>
            <Input
              id="display-name"
              placeholder="Your name"
              value={usernameDraft}
              onChange={(e) => setUsernameDraft(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="api-key" className="text-sm font-medium">
              OpenRouter API Key
            </label>
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              placeholder="sk-or-v1-..."
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get one at{" "}
              <a
                className="underline"
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Auto-attach page</span>
              <span className="text-xs text-muted-foreground">
                Include the current tab content with each message.
              </span>
            </div>
            <Switch
              checked={settings.value.autoAttach}
              onCheckedChange={(checked) =>
                settings.update({ autoAttach: checked })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => settings.onModalClose()}>
            Cancel
          </Button>
          <Button disabled={settings.isLoading} onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
