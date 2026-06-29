import type { UIMessageStreamWriter } from "ai";
import type { AskRequest, ConfirmRequest } from "./types";

/**
 * Bridges the transport's async tool execution with the React UI.
 *
 * Two interaction types:
 *
 * 1. **Confirmation** — `request()` writes a `data-confirmation` part
 *    (approve/reject card) and blocks until the user responds via `respond()`.
 *
 * 2. **Ask** — `ask()` writes a `data-ask-request` part (inline text input)
 *    and blocks until the user submits via `askRespond()`.
 *
 * The bridge instance is created once in the hook, shared with the transport,
 * and exposed to the message rendering layer so the UI can resolve the
 * pending promises.
 */
export class ConfirmationBridge {
  private confirmResolvers = new Map<string, (approved: boolean) => void>();
  private askResolvers = new Map<string, (response: string) => void>();

  request(
    req: ConfirmRequest,
    writer: UIMessageStreamWriter,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmResolvers.set(req.id, resolve);
      writer.write({ type: "data-confirmation", id: req.id, data: req });
    });
  }

  respond(id: string, approved: boolean): void {
    const resolver = this.confirmResolvers.get(id);
    if (resolver) {
      this.confirmResolvers.delete(id);
      resolver(approved);
    }
  }

  ask(req: AskRequest, writer: UIMessageStreamWriter): Promise<string> {
    return new Promise<string>((resolve) => {
      this.askResolvers.set(req.id, resolve);
      writer.write({ type: "data-ask-request", id: req.id, data: req });
    });
  }

  askRespond(id: string, response: string): void {
    const resolver = this.askResolvers.get(id);
    if (resolver) {
      this.askResolvers.delete(id);
      resolver(response);
    }
  }
}
