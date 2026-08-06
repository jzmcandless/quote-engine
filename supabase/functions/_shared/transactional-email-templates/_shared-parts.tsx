import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

export const BRAND = '#0ea5e9'
export const INK = '#1f2937'
export const MUTED = '#6b7280'
export const BORDER = '#e5e7eb'

export interface QuoteDetails {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  vehicleYear?: string | number
  vehicleMake?: string
  vehicleModel?: string
  drivetrain?: string
  fuelType?: string
  mileage?: string | number
  purchaseTimeframe?: string
  commercialUse?: string
  hasSnowplow?: string
  planName?: string
  yearsCovered?: string | number
  mileageCovered?: string | number
  deductible?: string
  price?: string | number
  surcharges?: Array<{ label?: string; amount?: number }>
  ineligibleMessage?: string
  vin?: string
  submittedAt?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Helvetica, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px', margin: '0 auto' }
const bar = { backgroundColor: BRAND, borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }
const barText = { color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: '0' }
const sectionTitle = {
  fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
  color: MUTED, margin: '24px 0 8px', fontWeight: 700,
}
const rowLabel = { color: MUTED, fontSize: '13px', margin: '0' }
const rowValue = { color: INK, fontSize: '14px', fontWeight: 600, margin: '0 0 10px' }
const hr = { borderColor: BORDER, margin: '20px 0' }

export function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <Section>
      <Text style={rowLabel}>{label}</Text>
      <Text style={rowValue}>{String(value)}</Text>
    </Section>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={sectionTitle}>{children}</Text>
}

export function money(v?: string | number) {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function Shell({
  title, preview, intro, children,
}: {
  title: string
  preview: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={bar}>
            <Text style={barText}>{title}</Text>
          </Section>
          {intro ? <Text style={{ color: INK, fontSize: '15px', margin: '0' }}>{intro}</Text> : null}
          {children}
          <Hr style={hr} />
          <Text style={{ color: MUTED, fontSize: '12px', margin: '0' }}>
            Eastgate Ford Extended Warranty — automated notification.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function ContactBlock(d: QuoteDetails) {
  return (
    <>
      <SectionTitle>Customer</SectionTitle>
      <Row label="Name" value={[d.firstName, d.lastName].filter(Boolean).join(' ')} />
      <Row label="Email" value={d.email} />
      <Row label="Phone" value={d.phone} />
    </>
  )
}

export function VehicleBlock(d: QuoteDetails) {
  return (
    <>
      <SectionTitle>Vehicle</SectionTitle>
      <Row
        label="Vehicle"
        value={[d.vehicleYear, d.vehicleMake, d.vehicleModel].filter(Boolean).join(' ')}
      />
      <Row label="Drivetrain" value={d.drivetrain} />
      <Row label="Fuel type" value={d.fuelType} />
      <Row label="VIN" value={d.vin} />
      <Row
        label="Current mileage"
        value={d.mileage != null && d.mileage !== '' ? `${Number(d.mileage).toLocaleString()} km` : undefined}
      />
      <Row label="Purchased new" value={d.purchaseTimeframe} />
      <Row label="Commercial use" value={d.commercialUse} />
      <Row label="Snowplow equipped" value={d.hasSnowplow} />
    </>
  )
}

export function CoverageBlock(d: QuoteDetails) {
  const surcharges = (d.surcharges ?? []).filter((s) => s && s.amount)
  return (
    <>
      <SectionTitle>Coverage</SectionTitle>
      <Row label="Plan" value={d.planName} />
      <Row
        label="Term"
        value={
          d.yearsCovered
            ? `${d.yearsCovered} years / ${Number(d.mileageCovered ?? 0).toLocaleString()} km`
            : undefined
        }
      />
      <Row label="Deductible" value={d.deductible} />
      <Row label="Price" value={money(d.price)} />
      {surcharges.map((s, i) => (
        <Row key={i} label={s.label || 'Surcharge'} value={money(s.amount)} />
      ))}
    </>
  )
}

export const SAMPLE: QuoteDetails = {
  firstName: 'Kristina',
  lastName: 'Parkinson',
  email: 'kristina@example.com',
  phone: '250-327-1888',
  vehicleYear: 2024,
  vehicleMake: 'Ford',
  vehicleModel: 'F-150',
  drivetrain: 'Standard',
  fuelType: 'Gas',
  mileage: 18000,
  purchaseTimeframe: 'Between 12 and 36 months',
  commercialUse: 'No',
  hasSnowplow: 'No',
  planName: 'PremiumCARE',
  yearsCovered: 4,
  mileageCovered: 60000,
  deductible: 'Disappearing',
  price: 2775,
  surcharges: [{ label: 'Timeframe/Mileage Surcharge', amount: 100 }],
  ineligibleMessage: 'Vehicles with over 36,000 km are not eligible for coverage.',
  submittedAt: 'August 6, 2026 at 9:41 AM PT',
}
