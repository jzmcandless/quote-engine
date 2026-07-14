import { createContext, useContext } from "react";

/**
 * Provides the DOM node that Radix Portals and Sonner should render into
 * when the app is embedded inside a Shadow DOM. Undefined in the main app
 * so behavior stays unchanged (portals go to document.body).
 */
export const ShadowRootContext = createContext<HTMLElement | undefined>(undefined);

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(ShadowRootContext);
}
