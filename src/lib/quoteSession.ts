import { supabase } from "@/integrations/supabase/client";

const ID_KEY = "quote_session_id";
const TOKEN_KEY = "quote_session_token";

let sessionId: string | null = null;
let writeToken: string | null = null;
let initPromise: Promise<void> | null = null;

function readStorage() {
  try {
    sessionId = localStorage.getItem(ID_KEY);
    writeToken = localStorage.getItem(TOKEN_KEY);
  } catch { /* noop */ }
}

function writeStorage(id: string, token: string) {
  sessionId = id;
  writeToken = token;
  try {
    localStorage.setItem(ID_KEY, id);
    localStorage.setItem(TOKEN_KEY, token);
  } catch { /* noop */ }
}

export function clearSessionId() {
  sessionId = null;
  writeToken = null;
  try {
    localStorage.removeItem(ID_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch { /* noop */ }
}

export function getSessionCredentials(): { session_id: string; write_token: string } | null {
  if (!sessionId || !writeToken) readStorage();
  if (!sessionId || !writeToken) return null;
  return { session_id: sessionId, write_token: writeToken };
}

export async function initSession(): Promise<void> {
  if (initPromise) return initPromise;
  readStorage();
  if (sessionId && writeToken) return;
  initPromise = (async () => {
    try {
      const { data, error } = await supabase.rpc("create_quote_session", {
        p_user_agent: navigator.userAgent,
        p_referrer: document.referrer || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.session_id && row?.write_token) {
        writeStorage(row.session_id, row.write_token);
      }
    } catch (err) {
      console.warn("[quoteSession] init failed", err);
    } finally {
      initPromise = null;
    }
  })();
  return initPromise;
}

// Allowlist of fields the browser is permitted to send. Anything else is
// dropped client-side (the server also enforces its own allowlist).
const ALLOWED_KEYS = new Set([
  "current_step", "vehicle", "additional_details", "coverage",
  "first_name", "last_name", "email", "phone", "user_agent", "referrer",
]);

let lastPatch = 0;
let pendingTimer: number | null = null;
let pendingPatch: Record<string, unknown> = {};

export async function patchSession(patch: Record<string, unknown>): Promise<void> {
  for (const [k, v] of Object.entries(patch)) {
    if (ALLOWED_KEYS.has(k)) pendingPatch[k] = v;
  }
  if (pendingTimer) return;
  const elapsed = Date.now() - lastPatch;
  const delay = Math.max(0, 400 - elapsed);
  pendingTimer = window.setTimeout(async () => {
    pendingTimer = null;
    lastPatch = Date.now();
    const toSend = pendingPatch;
    pendingPatch = {};
    if (!sessionId || !writeToken) await initSession();
    const creds = getSessionCredentials();
    if (!creds) return;
    try {
      await supabase.rpc("patch_quote_session", {
        p_session_id: creds.session_id,
        p_write_token: creds.write_token,
        p_patch: toSend as any,
      });
    } catch (err) {
      console.warn("[quoteSession] patch failed", err);
    }
  }, delay);
}

export async function heartbeat(): Promise<void> {
  const creds = getSessionCredentials();
  if (!creds) return;
  try {
    await supabase.rpc("patch_quote_session", {
      p_session_id: creds.session_id,
      p_write_token: creds.write_token,
      p_patch: {} as any,
    });
  } catch { /* noop */ }
}
