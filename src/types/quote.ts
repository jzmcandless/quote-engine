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

export interface QuoteState {
  step: number;
  vehicle: VehicleSelection;
  additionalDetails: AdditionalDetails;
  isEligible: boolean | null;
  ineligibleMessage: string;
  coverage: CoverageSelection;
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
  price: null,
  vehicleClass: null,
};
