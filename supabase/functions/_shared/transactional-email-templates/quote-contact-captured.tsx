import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import {
  ContactBlock, CoverageBlock, QuoteDetails, Row, SAMPLE, Shell, VehicleBlock,
} from './_shared-parts.tsx'

const Email = (d: QuoteDetails = {}) => (
  <Shell
    title="New quote viewed"
    preview={`${d.firstName ?? 'A customer'} entered their contact info to view a quote`}
    intro="A customer entered their contact information to see their quote."
  >
    {ContactBlock(d)}
    {VehicleBlock(d)}
    {CoverageBlock(d)}
    <Row label="Captured" value={d.submittedAt} />
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: QuoteDetails = {}) =>
    `Quote viewed — ${[d.firstName, d.lastName].filter(Boolean).join(' ') || 'new lead'}`,
  displayName: 'Contact captured (quote viewed)',
  previewData: SAMPLE,
} satisfies TemplateEntry
