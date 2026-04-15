/**
 * Smart CSV parser that handles the pivot/matrix pricing format
 * with multiline quoted headers and multiple deductible columns.
 *
 * Expected CSV layout:
 *   Plan Type, (term), Distance Coverage, Category A, ..., Category H, Rental Plus!, $0 Deductible, Disappearing Deductible, $50 Deductible, $200 Deductible
 */

export interface ParsedPricingRow {
  planName: string;
  vehicleClass: string;
  yearsCovered: number;
  mileageCovered: number;
  deductible: string;
  deductibleCost: number;
  price: number;
  rentalPlus: number;
}

/** Parse a full CSV text handling newlines inside quoted fields */
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch; // preserve quotes for parseCSVLine
    } else if (ch === "\n" && !inQuotes) {
      if (current.trim() !== "") rows.push(parseCSVLine(current));
      current = "";
    } else if (ch === "\r" && !inQuotes) {
      // skip CR
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") rows.push(parseCSVLine(current));
  return rows;
}

/** Parse a single CSV line into fields (no newlines expected) */
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
  return cleaned === "" ? NaN : Number(cleaned);
}

/** Extract integer from strings like "4 Year Plan" */
function parseYears(val: string): number {
  const match = val.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

/** Normalize deductible header to a display-friendly label */
function normalizeDeductibleName(header: string): string {
  const h = header.replace(/\s+/g, " ").trim();
  if (/\$0\s*deductible/i.test(h)) return "$0 Deductible";
  if (/disappearing/i.test(h)) return "Disappearing Deductible";
  const match = h.match(/\$(\d+)\s*deductible/i);
  if (match) return `$${match[1]} Deductible`;
  return h;
}

export function parsePricingCSV(text: string): ParsedPricingRow[] {
  const allRows = parseCSVRows(text);
  if (allRows.length < 2) throw new Error("CSV must have a header and at least one data row.");

  const headers = allRows[0];

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

  // Find Rental Plus column
  const rentalPlusIdx = headers.findIndex((h) => /rental\s*plus/i.test(h));

  // Find deductible columns (anything with "deductible" in the header)
  const deductibleCols: { index: number; name: string }[] = [];
  headers.forEach((h, i) => {
    if (/deductible/i.test(h.trim()) && !categoryIndices.some((c) => c.index === i)) {
      deductibleCols.push({ index: i, name: normalizeDeductibleName(h) });
    }
  });

  if (deductibleCols.length === 0) {
    throw new Error("No deductible columns found. Expected headers like '$0 Deductible', '$50 Deductible', etc.");
  }

  const rows: ParsedPricingRow[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const vals = allRows[i];
    if (vals.length < 4) continue;

    const planName = vals[0]?.trim();
    if (!planName) continue;

    const yearsCovered = parseYears(vals[1] || "");
    const mileageCovered = parseNum(vals[2] || "0");
    if (isNaN(mileageCovered)) continue;
    const rentalPlus = rentalPlusIdx >= 0 ? (parseNum(vals[rentalPlusIdx] || "0") || 0) : 0;

    // Unpivot: one row per category × deductible combination
    for (const cat of categoryIndices) {
      const price = parseNum(vals[cat.index] || "");
      if (isNaN(price) || price === 0) continue;

      for (const ded of deductibleCols) {
        const dedVal = vals[ded.index] ?? "";
        const dedCost = parseNum(dedVal);
        // Skip if no value provided for this deductible option
        if (dedVal.trim() === "" || isNaN(dedCost)) continue;

        rows.push({
          planName,
          vehicleClass: cat.name,
          yearsCovered,
          mileageCovered: Math.round(mileageCovered),
          deductible: ded.name,
          deductibleCost: dedCost,
          price,
          rentalPlus,
        });
      }
    }
  }

  if (rows.length === 0) throw new Error("No valid pricing rows could be parsed from the CSV.");
  return rows;
}
