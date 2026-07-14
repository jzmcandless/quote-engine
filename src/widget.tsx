import React from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { QuoteWizard } from "@/components/quote/QuoteWizard";
import { ShadowRootContext } from "@/lib/shadow-root-context";
import widgetCss from "@/widget.css?inline";

const queryClient = new QueryClient();

function WidgetApp({
  showHeader,
  portalContainer,
}: {
  showHeader: boolean;
  portalContainer: HTMLElement;
}) {
  return (
    <ShadowRootContext.Provider value={portalContainer}>
      <QueryClientProvider client={queryClient}>
        <QuoteWizard showHeader={showHeader} />
        {/* Portal Sonner into the shadow root so it inherits theme tokens */}
        {createPortal(<Toaster />, portalContainer)}
      </QueryClientProvider>
    </ShadowRootContext.Provider>
  );
}

class QuoteWizardElement extends HTMLElement {
  private root: ReturnType<typeof createRoot> | null = null;

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });

    // Inject compiled Tailwind + theme CSS into the shadow root.
    const style = document.createElement("style");
    style.textContent = widgetCss;
    shadow.appendChild(style);

    // Load fonts once in the light DOM (font-face rules can't be scoped to shadow).
    if (!document.querySelector("link[data-quote-wizard-fonts]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:wght@300;400;500;600;700&display=swap";
      link.setAttribute("data-quote-wizard-fonts", "true");
      document.head.appendChild(link);
    }

    // App mount point
    const container = document.createElement("div");
    shadow.appendChild(container);

    // Portal target for Radix popovers, dialogs, and toasts — inside shadow
    // so styles apply and events are captured within the widget boundary.
    const portalRoot = document.createElement("div");
    portalRoot.setAttribute("data-portal-root", "");
    shadow.appendChild(portalRoot);

    const showHeader = !this.hasAttribute("hide-header");

    this.root = createRoot(container);
    this.root.render(
      <React.StrictMode>
        <WidgetApp showHeader={showHeader} portalContainer={portalRoot} />
      </React.StrictMode>,
    );
  }

  disconnectedCallback() {
    this.root?.unmount();
  }
}

if (!customElements.get("quote-wizard")) {
  customElements.define("quote-wizard", QuoteWizardElement);
}
