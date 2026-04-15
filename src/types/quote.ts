export interface VehicleSelection {
  year: number | null;
  make: string;
  model: string;
}

export interface AdditionalDetails {
  [key: string]: string | number;
}

export interface CoverageSelection {
  planId: string;
  planName: string;
  yearsCovered: number;
  mileageCovered: number;
  deductible: number;
}

export interface QuoteState {
  step: number;
  vehicle: VehicleSelection;
  additionalDetails: AdditionalDetails;
  isEligible: boolean | null;
  ineligibleMessage: string;
  coverage: CoverageSelection;
  price: number | null;
  vehicleClass: string | null;
}

export const initialQuoteState: QuoteState = {
  step: 1,
  vehicle: { year: null, make: '', model: '' },
  additionalDetails: {},
  isEligible: null,
  ineligibleMessage: '',
  coverage: { planId: '', planName: '', yearsCovered: 0, mileageCovered: 0, deductible: 0 },
  price: null,
  vehicleClass: null,
};
