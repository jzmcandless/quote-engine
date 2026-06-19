import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { QuoteWizard } from "@/components/quote/QuoteWizard";
import indexCss from "@/index.css?inline";

const queryClient = new QueryClient();

class QuoteWizardElement extends HTMLElement {
  private root: ReturnType<typeof createRoot> | null = null;

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });

    // Inject styles into shadow DOM
    const style = document.createElement("style");
    style.textContent = indexCss;
    shadow.appendChild(style);

    // Load fonts in the main document if not already present
    if (!document.querySelector('link[data-quote-wizard-fonts]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:wght@300;400;500;600;700&display=swap";
      link.setAttribute("data-quote-wizard-fonts", "true");
      document.head.appendChild(link);
    }

    const container = document.createElement("div");
    shadow.appendChild(container);

    const showHeader = !this.hasAttribute("hide-header");

    this.root = createRoot(container);
    this.root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <QuoteWizard showHeader={showHeader} />
          <Toaster />
        </QueryClientProvider>
      </React.StrictMode>
    );
  }

  disconnectedCallback() {
    this.root?.unmount();
  }
}

customElements.define("quote-wizard", QuoteWizardElement);
