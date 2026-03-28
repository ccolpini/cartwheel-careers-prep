// hooks/useCopilotTracking.ts
// Drop into your hooks/ directory and import wherever the Copilot component lives.
// Fires events to /api/track — failures are swallowed silently.

import { useCallback, useEffect, useRef } from "react";

export type CopilotEventName =
  | "role_page_viewed"
  | "chat_opened"
  | "chat_message_sent"
  | "chat_session_ended"
  | "apply_clicked"
  | "role_page_exited";

export interface CopilotEvent {
  event: CopilotEventName;
  roleId: string;
  roleTitle: string;
  roleFamily: string;
  sessionId: string;
  durationSeconds?: number;
  messageCount?: number;
  source?: string;
  timestamp?: string;
}

// ─── Tiny session ID generator ────────────────────────────────────────────────
function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Referrer parser ──────────────────────────────────────────────────────────
function parseSource(): string {
  if (typeof window === "undefined") return "direct";
  const ref = document.referrer;
  if (!ref) return "direct";
  if (ref.includes("linkedin.com")) return "linkedin";
  if (ref.includes("greenhouse.io") || ref.includes("gem.com")) return "ats";
  if (ref.includes("mail.google") || ref.includes("outlook")) return "email";
  return new URL(ref).hostname;
}

// ─── Core hook ───────────────────────────────────────────────────────────────
interface TrackingConfig {
  roleId: string;
  roleTitle: string;
  roleFamily: string;
}

export function useCopilotTracking({ roleId, roleTitle, roleFamily }: TrackingConfig) {
  const sessionIdRef = useRef<string>(generateSessionId());
  const pageEnteredAt = useRef<number>(Date.now());
  const chatOpenedAt = useRef<number | null>(null);
  const messageCountRef = useRef<number>(0);
  const source = useRef<string>(parseSource());

  // ── Base fire function ────────────────────────────────────────────────────
  const fire = useCallback(
    async (
      event: CopilotEventName,
      extras?: Partial<Pick<CopilotEvent, "durationSeconds" | "messageCount">>
    ) => {
      const payload: CopilotEvent = {
        event,
        roleId,
        roleTitle,
        roleFamily,
        sessionId: sessionIdRef.current,
        source: source.current,
        timestamp: new Date().toISOString(),
        ...extras,
      };

      try {
        await fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          // keepalive lets the request complete even if the page navigates away
          keepalive: true,
        });
      } catch {
        // Never let tracking errors surface to the candidate
      }
    },
    [roleId, roleTitle, roleFamily]
  );

  // ── Auto-fire role_page_viewed on mount ───────────────────────────────────
  useEffect(() => {
    fire("role_page_viewed");

    // Fire role_page_exited on unmount
    return () => {
      const duration = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      fire("role_page_exited", { durationSeconds: duration });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]); // re-fires if role changes without full page reload

  // ── Exported event triggers ───────────────────────────────────────────────

  const trackChatOpened = useCallback(() => {
    chatOpenedAt.current = Date.now();
    fire("chat_opened");
  }, [fire]);

  const trackMessageSent = useCallback(() => {
    messageCountRef.current += 1;
    // Only log the first message to avoid spamming the sheet
    if (messageCountRef.current === 1) {
      fire("chat_message_sent");
    }
  }, [fire]);

  const trackChatEnded = useCallback(() => {
    const duration = chatOpenedAt.current
      ? Math.round((Date.now() - chatOpenedAt.current) / 1000)
      : undefined;
    fire("chat_session_ended", {
      durationSeconds: duration,
      messageCount: messageCountRef.current,
    });
    // Reset for if they reopen chat
    chatOpenedAt.current = null;
    messageCountRef.current = 0;
  }, [fire]);

  const trackApplyClicked = useCallback(() => {
    fire("apply_clicked");
  }, [fire]);

  return {
    trackChatOpened,
    trackMessageSent,
    trackChatEnded,
    trackApplyClicked,
  };
}
