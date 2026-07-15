// Shared validation helpers for anonymous edge-function endpoints.
// All error responses go through `bad()` which returns generic slugs only —
// never raw exception text, table names, or Postgres error details.
import { z } from "npm:zod@3.23.8";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const MAX_BODY_BYTES = 8192;

export function bad(status: number, code: string) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Read + size-check a JSON body. Returns null on failure and lets the caller
// respond with a generic error.
export async function readJsonBody(req: Request): Promise<unknown | null> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY_BYTES) return null;
  let text: string;
  try {
    text = await req.text();
  } catch {
    return null;
  }
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Structural guard: bound depth, key count, and string length before zod parse.
export function assertShape(
  value: unknown,
  opts: { maxDepth?: number; maxKeys?: number; maxStringLen?: number } = {},
): boolean {
  const maxDepth = opts.maxDepth ?? 5;
  const maxKeys = opts.maxKeys ?? 50;
  const maxStringLen = opts.maxStringLen ?? 1000;
  const walk = (v: unknown, depth: number): boolean => {
    if (depth > maxDepth) return false;
    if (v === null || typeof v !== "object") {
      if (typeof v === "string" && v.length > maxStringLen) return false;
      return true;
    }
    if (Array.isArray(v)) {
      if (v.length > maxKeys) return false;
      return v.every((x) => walk(x, depth + 1));
    }
    const keys = Object.keys(v as object);
    if (keys.length > maxKeys) return false;
    for (const k of keys) {
      if (k.length > 64) return false;
      if (!walk((v as Record<string, unknown>)[k], depth + 1)) return false;
    }
    return true;
  };
  return walk(value, 0);
}

// ---------- Regex / enums ----------
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+\d][\d\s\-().]{5,19}$/;
const VIN = /^[A-HJ-NPR-Z0-9]{11,17}$/i;
const TOKEN = /^[A-Za-z0-9+/=]{20,100}$/;

export const PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Nova Scotia", "Ontario",
  "Prince Edward Island", "Quebec", "Saskatchewan",
  "Northwest Territories", "Nunavut", "Yukon",
] as const;

export const DEDUCTIBLES = ["$0", "$50", "$200", "Disappearing"] as const;

const YES_NO = z.enum(["Yes", "No"]);
const TIMEFRAME = z.enum([
  "Less than 12 months",
  "Between 12 and 36 months",
  "More than 36 months",
]);

// additional_details: allowlisted keys only; unknown keys → parse fails.
const AdditionalDetails = z
  .object({
    mileage: z.union([z.number().int().min(0).max(1_000_000), z.string().regex(/^\d{1,7}$/)]).optional(),
    purchase_timeframe: TIMEFRAME.optional(),
    commercial_use: YES_NO.optional(),
    has_snowplow: YES_NO.optional(),
  })
  .strict();

const Vehicle = z
  .object({
    year: z.number().int().min(1980).max(2100).nullable(),
    make: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(120),
    drivetrain: z.string().trim().max(40).default(""),
    fuelType: z.string().trim().max(40).default(""),
  })
  .strict();

const Coverage = z
  .object({
    planId: z.string().regex(UUID),
    planName: z.string().trim().min(1).max(120),
    yearsCovered: z.number().int().min(1).max(15),
    mileageCovered: z.number().int().min(1000).max(500_000),
    deductible: z.enum(DEDUCTIBLES),
  })
  .strict();

export const ComputeSchema = z
  .object({
    session_id: z.string().regex(UUID),
    write_token: z.string().regex(TOKEN),
    vehicle: Vehicle,
    additional_details: AdditionalDetails.default({}),
    coverage: Coverage.optional(),
  })
  .strict();

const Contact = z
  .object({
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    email: z.string().trim().min(5).max(255).regex(EMAIL),
    phone: z.string().trim().min(7).max(20).regex(PHONE),
    vin: z.union([z.string().trim().regex(VIN), z.literal(""), z.null()]).optional(),
    street_address: z.union([z.string().trim().max(200), z.null()]).optional(),
    city: z.union([z.string().trim().max(100), z.null()]).optional(),
    province: z.union([z.enum(PROVINCES), z.literal(""), z.null()]).optional(),
  })
  .strict();

export const SubmitSchema = z
  .object({
    session_id: z.string().regex(UUID),
    write_token: z.string().regex(TOKEN),
    kind: z.enum(["purchase", "custom_request"]),
    contact: Contact,
  })
  .strict();

export type ComputeInput = z.infer<typeof ComputeSchema>;
export type SubmitInput = z.infer<typeof SubmitSchema>;
