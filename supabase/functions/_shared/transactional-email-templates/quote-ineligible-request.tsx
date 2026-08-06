import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  ContactBlock, QuoteDetails, SAMPLE, SectionTitle, Shell, VehicleBlock, Row,
} from './_shared-parts.tsx'

const Email = (d: QuoteDetails = {}) => (
  <Shell
    title="Custom quote request (ineligible vehicle)"
    preview={`Custom quote request from ${d.firstName ?? 'a customer'}`}
    intro="A customer's vehicle was not eligible for standard coverage and they submitted a custom quote request."
  >
    {d.ineligibleMessage ? (
      <>
        <SectionTitle>Reason not eligible</SectionTitle>
        <Text style={{ color: '#b91c1c', fontSize: '14px', fontWeight: 600, margin: '0' }}>
          {d.ineligibleMessage}
        </Text>
      </>
    ) : null}
    {ContactBlock(d)}
    {VehicleBlock(d)}
    <Row label="Submitted" value={d.submittedAt} />
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: QuoteDetails = {}) =>
    `Custom quote request — ${[d.vehicleYear, d.vehicleMake, d.vehicleModel].filter(Boolean).join(' ') || 'ineligible vehicle'}`,
  displayName: 'Ineligible — custom quote request',
  previewData: SAMPLE,
} satisfies TemplateEntry
