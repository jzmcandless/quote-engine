// Editable email notification templates.
// Defaults live here; user edits are persisted to localStorage until a
// dedicated DB-backed source of truth is wired up alongside email sending.

export type EmailTemplateKey = "ineligible-quote-request" | "purchase-completed";

export interface EmailTemplate {
  key: EmailTemplateKey;
  name: string;
  description: string;
  subject: string;
  heading: string;
  intro: string;
  footer: string;
}

export const DEFAULT_TEMPLATES: Record<EmailTemplateKey, EmailTemplate> = {
  "ineligible-quote-request": {
    key: "ineligible-quote-request",
    name: "Ineligible Quote Request",
    description:
      "Sent when a customer is deemed ineligible and submits the custom warranty quote form.",
    subject:
      "New custom warranty quote request from {{firstName}} {{lastName}}",
    heading: "New Custom Warranty Quote Request",
    intro:
      "A customer was deemed ineligible for an automated quote and has submitted a request for a custom warranty quote. Their full vehicle and contact details are below.",
    footer:
      "This notification was sent automatically from your Extended Warranty Quote Generator.",
  },
  "purchase-completed": {
    key: "purchase-completed",
    name: "Purchase Completed",
    description:
      "Sent when an eligible customer completes a warranty purchase.",
    subject:
      "New extended warranty purchase from {{firstName}} {{lastName}}",
    heading: "New Extended Warranty Purchase",
    intro:
      "{{firstName}} {{lastName}} has just completed a purchase for an extended warranty. The full customer, vehicle, and coverage details are below.",
    footer:
      "This notification was sent automatically from your Extended Warranty Quote Generator.",
  },
};

const STORAGE_PREFIX = "email-template:";

export function loadTemplate(key: EmailTemplateKey): EmailTemplate {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return DEFAULT_TEMPLATES[key];
    const parsed = JSON.parse(raw) as Partial<EmailTemplate>;
    return { ...DEFAULT_TEMPLATES[key], ...parsed, key };
  } catch {
    return DEFAULT_TEMPLATES[key];
  }
}

export function saveTemplate(template: EmailTemplate): void {
  localStorage.setItem(
    STORAGE_PREFIX + template.key,
    JSON.stringify(template),
  );
}

export function resetTemplate(key: EmailTemplateKey): EmailTemplate {
  localStorage.removeItem(STORAGE_PREFIX + key);
  return DEFAULT_TEMPLATES[key];
}

export function applyTokens(
  text: string,
  data: Record<string, string | number>,
): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) =>
    data[k] !== undefined ? String(data[k]) : `{{${k}}}`,
  );
}
