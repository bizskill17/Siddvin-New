export interface ContactPerson {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
}

export interface Property {
  id: string; // Property ID (Text, Key, Unique ID)
  address: string; // New: Property Address
  googleMapsLink: string | null; // New: Google Maps Link
  contactPersons: ContactPerson[]; // New: Multiple contact persons
  proposedRent: number | null; // Proposed Rent (Price or Number) - Changed to allow null for empty initial state
  proposedArea: number | null; // Proposed Area (Number) - Changed to allow null for empty initial state
  serviceFeeProposed: string; // Service Fee Proposed (Text or Price)
  notes: string; // Renamed from 'terms' (LongText)
  password: string; // New: Property password
}

export interface Brand {
  id: string; // Brand ID (Text, Key, Unique ID)
  name: string; // Brand Name (Text)
  contactPersons: ContactPerson[]; // New: Multiple contact persons
  serviceFeeAgreed: string; // Service Fee Agreed (Text or Price)
  assignedRep: string; // Assigned Rep (Name or Email) - Will store email
  logoUrl: string | null; // New: Brand logo URL
}

export interface SidvinTeamMember {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
  role: 'Admin' | 'Employee';
  password: string; // New: Password for team member
}

export enum CurrentStageEnum {
  Draft = "1. Draft",
  PendingFollowUp = "2. Pending Follow Up",
  PendingVisitScheduling = "3. Pending Visit Scheduling",
  PendingVisit = "4. Pending Visit",
  PendingVisitAgain = "5. Pending Visit Again",
  PendingRateFinalization = "6. Pending Rate Finalization",
  PendingTermsFinalization = "7. Pending Terms Finalization",
  PendingAgreement = "8. Pending Agreement / Store Opening",
  PendingBrandFees = "9. Pending Brand Fees",
  CompletedProposal = "10. Completed Proposal"
}

export interface Proposal {
  id: string; // Proposal ID (Text, Key, Unique ID), Initial Value of UNIQUEID()
  propertyId: string; // Property ID (Ref to Properties)
  brandId: string; // Brand ID (Ref to Brands)
  currentStage: CurrentStageEnum; // Current Stage (Enum, calculated via an App Formula)
  proposalDate: string | null; // Proposal Date (Date)
  proposalSender: string; // Proposal Sender (Name or Email)
  // Removed nextFollowUpDate: string | null;
  brandRemarks: string; // Brand Remarks (LongText)
  specificDetailsRequiredByBrand: string; // Specific Details Required by Brand (LongText)
  detailsSentStatus: boolean; // Details Sent Status (Yes/No)
  rateFinalized: boolean; // Rate Finalized (Yes/No)
  invoiceStatus: boolean; // Invoice Status for Pending Brand Fees
}

export interface FollowUp {
  id: string;
  proposalId: string;
  followUpDate: string | null; // When this follow-up is scheduled or occurred
  remarks: string;
  status: 'Follow Up Again' | 'Schedule Visit' | 'Cancel Proposal';
  nextFollowUpDate: string | null;
  plannedVisitDate: string | null;
  cancelRemarks: string | null;
}

export interface Visit {
  id: string; // Visit ID (Text, Key, Unique ID)
  proposalId: string; // Proposal ID (Ref to Proposal)
  scheduledDate: string | null; // Scheduled Date (Date)
  scheduledTime: string | null; // Scheduled Time (Time)
  visitDate: string | null; // Visit Date (Date)
  developerAttendees: string; // Developer Attendees (Text)
  brandAttendees: string; // Brand Attendees (Text)
  sidvinAttendees: string; // Sidvin Attendees (Text) - Now comma-separated for multi-select
  visitOutcome: string; // Visit Outcome (LongText)
}

export interface TermSheetAgreement {
  proposalId: string; // Proposal ID (Ref to Proposal) - Key for one-to-one relationship
  specificTerms: string; // LongText
  handoverDate: string | null; // Date
  rentFreePeriodDays: number | null; // Number
  rentCommencementDate: string | null; // Date
  plannedOpeningDate: string | null; // Date
  loiTermSheetDate: string | null; // LOI/Term Sheet Date (Date)
  advancePlan: string; // Text
  agreementDate: string | null; // Date - Kept in model, but updated by specific form
  agreementRegistrationDate: string | null; // Date - Kept in model, but updated by specific form
  storeOpeningDate: string | null; // Date - Kept in model, but updated by specific form

  // New Property Facility fields
  ac: string; // Air Conditioning
  fireFightingSystem: string; // Fire Fighting System
  flooring: string; // Flooring
  lift: string; // Lift
  internalWalls: string; // Internal Walls
  toilets: string; // Toilets
  storeFront: string; // Store Front
  glassFacadeGlazing: string; // Glass Façade / Glazing
  electricalPanel: string; // Electrical Panel
  powerLoad: string; // Power Load
  dgBackup: string; // DG Backup
}
