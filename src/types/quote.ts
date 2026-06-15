export interface VehicleSelection {
  year: number | null;
  make: string;
  model: string;
  drivetrain: string;
  fuelType: string;
}

export interface AdditionalDetails {
  [key: string]: string | number;
}

export interface CoverageSelection {
  planId: string;
  planName: string;
  yearsCovered: number;
  mileageCovered: number;
  deductible: string;
}

export interface AppliedSurcharge {
  type: string;
  label: string;
  amount: number;
}

export interface ContactInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface QuoteState {
  step: number;
  vehicle: VehicleSelection;
  additionalDetails: AdditionalDetails;
  isEligible: boolean | null;
  ineligibleMessage: string;
  coverage: CoverageSelection;
  contact: ContactInfo;
  price: number | null;
  surcharges: AppliedSurcharge[];
  vehicleClass: string | null;
}

export const initialQuoteState: QuoteState = {
  step: 1,
  vehicle: { year: null, make: '', model: '', drivetrain: '', fuelType: '' },
  additionalDetails: {},
  isEligible: null,
  ineligibleMessage: '',
  coverage: { planId: '', planName: '', yearsCovered: 0, mileageCovered: 0, deductible: '' },
  contact: { firstName: '', lastName: '', phone: '', email: '' },
  price: null,
  surcharges: [],
  vehicleClass: null,
};
