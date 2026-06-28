import { Toaster } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { ConfigProvider } from "@/contexts/config";
import { ConversationsProvider } from "@/contexts/conversations";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.tsx";
import { ChatModelSelector } from "./components/chat-model-selector.tsx";
import { SessionsDialog } from "./components/sessions-dialog.tsx";
import { SettingsDialog } from "./components/settings-dialog.tsx";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider>
      <ConversationsProvider>
        <TooltipProvider>
          <App />
          <SettingsDialog />
          <ChatModelSelector />
          <SessionsDialog />
          <Toaster />
        </TooltipProvider>
      </ConversationsProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
