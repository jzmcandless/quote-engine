/**
 * Smart CSV parser that handles the pivot/matrix pricing format.
 *
 * Expected CSV layout:
 *   Plan Type, (term), Distance Coverage, Category A, ..., Category H, Rental Plus!, Deductible
 *   PremiumCARE PLUS!, 4 Year Plan, "80,000", "$1,106", ..., "$2,117", $0, $0
 */

export interface ParsedPricingRow {
  planName: string;
  vehicleClass: string;
  yearsCovered: number;
  mileageCovered: number;
  deductible: number;
  price: number;
  rentalPlus: number;
}

/** Parse a CSV string that may contain quoted fields with commas */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** Strip $ signs, commas, quotes and parse as number */
function parseNum(val: string): number {
  const cleaned = val.replace(/[$,"""]/g, "").trim();
  return cleaned === "" ? 0 : Number(cleaned);
}

/** Extract integer from strings like "4 Year Plan" */
function parseYears(val: string): number {
  const match = val.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function parsePricingCSV(text: string): ParsedPricingRow[] {
  const lines = text.trim().split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new Error("CSV must have a header and at least one data row.");

  const headers = parseCSVLine(lines[0]);

  // Detect category columns (e.g. "Category A" through "Category H")
  const categoryIndices: { index: number; name: string }[] = [];
  headers.forEach((h, i) => {
    if (/^category\s+[a-z]$/i.test(h.trim())) {
      categoryIndices.push({ index: i, name: h.trim() });
    }
  });

  if (categoryIndices.length === 0) {
    throw new Error("No category columns found. Expected headers like 'Category A', 'Category B', etc.");
  }

  // Find special columns
  const rentalPlusIdx = headers.findIndex((h) => /rental\s*plus/i.test(h));
  const deductibleIdx = headers.findIndex((h) => /deductible/i.test(h));

  const rows: ParsedPricingRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length < 4) continue; // skip empty/short lines

    const planName = vals[0]?.trim();
    if (!planName) continue;

    const yearsCovered = parseYears(vals[1] || "");
    const mileageCovered = parseNum(vals[2] || "0");
    const deductible = deductibleIdx >= 0 ? parseNum(vals[deductibleIdx] || "0") : 0;
    const rentalPlus = rentalPlusIdx >= 0 ? parseNum(vals[rentalPlusIdx] || "0") : 0;

    // Unpivot: one row per category
    for (const cat of categoryIndices) {
      const price = parseNum(vals[cat.index] || "0");
      if (price === 0) continue; // skip zero/empty prices

      rows.push({
        planName,
        vehicleClass: cat.name,
        yearsCovered,
        mileageCovered,
        deductible,
        price,
        rentalPlus,
      });
    }
  }

  if (rows.length === 0) throw new Error("No valid pricing rows could be parsed from the CSV.");
  return rows;
}
