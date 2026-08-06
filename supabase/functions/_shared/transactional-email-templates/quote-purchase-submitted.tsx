import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import {
  ContactBlock, CoverageBlock, QuoteDetails, Row, SAMPLE, Shell, VehicleBlock,
} from './_shared-parts.tsx'

const Email = (d: QuoteDetails = {}) => (
  <Shell
    title="Warranty purchase submitted"
    preview={`${d.firstName ?? 'A customer'} submitted a warranty purchase`}
    intro="A customer completed the quote wizard and submitted their warranty purchase."
  >
    {ContactBlock(d)}
    {VehicleBlock(d)}
    {CoverageBlock(d)}
    <Row label="Submitted" value={d.submittedAt} />
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: QuoteDetails = {}) =>
    `Purchase submitted — ${[d.firstName, d.lastName].filter(Boolean).join(' ') || 'new customer'}`,
  displayName: 'Purchase submitted',
  previewData: SAMPLE,
} satisfies TemplateEntry
