export type PatternAccessory = {
  id: string;
  name: string;
  unitPrice: number;
};

export type QuotePattern = {
  id: string;
  name: string;
  dimensions: string | null;
  weight: string | null;
  production_time: string | null;
  notes: string | null;
  accessories: PatternAccessory[];
  active: boolean;
};

export type QuoteInput = {
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  description: string;
  quantity: number;
  validityDays: number;
  notes?: string;
  filamentCost: number;
  energyCost: number;
  laborCost: number;
  fixedCost: number;
  marginPercent: number;
  unitPrice: number;
  total: number;
};

export type SavedQuote = {
  id: string;
  quote_number: string;
};
