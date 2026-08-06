// deno-lint-ignore-file no-explicit-any
import { template as quoteIneligibleRequest } from './quote-ineligible-request.tsx'
import { template as quoteContactCaptured } from './quote-contact-captured.tsx'
import { template as quotePurchaseSubmitted } from './quote-purchase-submitted.tsx'

export interface TemplateEntry {
  component: (props: any) => any
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'quote-ineligible-request': quoteIneligibleRequest,
  'quote-contact-captured': quoteContactCaptured,
  'quote-purchase-submitted': quotePurchaseSubmitted,
}
