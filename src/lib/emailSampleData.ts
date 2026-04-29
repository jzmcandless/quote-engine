// Sample data used to render the email preview in the admin editor.

import type { EmailTemplateKey } from "./emailTemplates";

export interface EmailDataSection {
  title: string;
  rows: Array<{ label: string; value: string }>;
}

export interface EmailData {
  tokens: Record<string, string | number>;
  sections: EmailDataSection[];
}

const ineligibleSample: EmailData = {
  tokens: { firstName: "Jane", lastName: "Doe" },
  sections: [
    {
      title: "Customer",
      rows: [
        { label: "Name", value: "Jane Doe" },
        { label: "Email", value: "jane.doe@example.com" },
        { label: "Phone", value: "(555) 123-4567" },
        { label: "VIN", value: "1FTFW1ET5DFC10312" },
      ],
    },
    {
      title: "Vehicle",
      rows: [
        { label: "Year", value: "2017" },
        { label: "Make", value: "Ford" },
        { label: "Model", value: "F-150" },
        { label: "Drivetrain", value: "4x4" },
        { label: "Fuel Type", value: "Gas" },
      ],
    },
    {
      title: "Additional Details",
      rows: [
        { label: "Current Mileage", value: "165,000 km" },
        { label: "Purchase Timeframe", value: "Already Owned > 30 days" },
        { label: "Used Commercially", value: "No" },
        { label: "Equipped with Snowplow", value: "No" },
      ],
    },
  ],
};

const purchaseSample: EmailData = {
  tokens: { firstName: "John", lastName: "Smith" },
  sections: [
    {
      title: "Customer",
      rows: [
        { label: "Name", value: "John Smith" },
        { label: "Email", value: "john.smith@example.com" },
        { label: "Phone", value: "(555) 987-6543" },
        { label: "Address", value: "123 Main St, Toronto, Ontario" },
        { label: "VIN", value: "1FA6P8TH5J5123456" },
      ],
    },
    {
      title: "Vehicle",
      rows: [
        { label: "Year", value: "2022" },
        { label: "Make", value: "Ford" },
        { label: "Model", value: "Mustang" },
        { label: "Drivetrain", value: "RWD" },
        { label: "Fuel Type", value: "Gas" },
        { label: "Used for commercial purposes", value: "No" },
        { label: "Equipped with a snowplow", value: "No" },
      ],
    },
    {
      title: "Coverage",
      rows: [
        { label: "Plan", value: "PremiumCARE" },
        { label: "Term", value: "5 Years" },
        { label: "Mileage", value: "100,000 km" },
        { label: "Deductible", value: "$100" },
      ],
    },
    {
      title: "Pricing",
      rows: [{ label: "Total Price", value: "$3,245.00" }],
    },
  ],
};

export function getSampleData(key: EmailTemplateKey): EmailData {
  return key === "ineligible-quote-request" ? ineligibleSample : purchaseSample;
}
