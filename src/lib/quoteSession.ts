import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "quote_session_id";

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function getSessionId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = genId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return genId();
  }
}

export function clearSessionId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

let lastPatch = 0;
let pendingTimer: number | null = null;
let pendingPatch: Record<string, unknown> = {};

export async function patchSession(patch: Record<string, unknown>): Promise<void> {
  pendingPatch = { ...pendingPatch, ...patch };
  if (pendingTimer) return;
  const elapsed = Date.now() - lastPatch;
  const delay = Math.max(0, 400 - elapsed);
  pendingTimer = window.setTimeout(async () => {
    pendingTimer = null;
    lastPatch = Date.now();
    const toSend = pendingPatch;
    pendingPatch = {};
    const session_id = getSessionId();
    try {
      await supabase.rpc("upsert_quote_session", {
        p_session_id: session_id,
        p_patch: toSend as any,
      });
    } catch (err) {
      // Silent fail — analytics shouldn't break UX
      console.warn("[quoteSession] patch failed", err);
    }
  }, delay);
}

export async function initSession(): Promise<void> {
  const session_id = getSessionId();
  try {
    await supabase.rpc("upsert_quote_session", {
      p_session_id: session_id,
      p_patch: {
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        current_step: 1,
      } as any,
    });
  } catch (err) {
    console.warn("[quoteSession] init failed", err);
  }
}

export async function heartbeat(): Promise<void> {
  const session_id = getSessionId();
  try {
    await supabase.rpc("upsert_quote_session", {
      p_session_id: session_id,
      p_patch: {} as any,
    });
  } catch {
    /* noop */
  }
}

export async function markCompleted(
  status: "completed_purchase" | "completed_custom_request" | "completed_ineligible",
  extra: Record<string, unknown> = {}
): Promise<void> {
  const session_id = getSessionId();
  try {
    await supabase.rpc("upsert_quote_session", {
      p_session_id: session_id,
      p_patch: { status, ...extra } as any,
    });
  } catch (err) {
    console.warn("[quoteSession] complete failed", err);
  }
}
