export type UserRole = 'Admin' | 'Employee' | 'Super Admin' | 'Property Fee Coordinator';

export interface ContactPerson {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
}

export interface AuditFields {
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type PropertyFeeStatus =
  | 'Pending Property Email'
  | 'Pending Negotiation'
  | 'Pending Acceptance Email'
  | 'Pending MOU Signing'
  | 'Accepted & Signed';

export interface Property extends AuditFields {
  id: string;
  serialNo?: number;
  address: string;
  googleMapsLink: string | null;
  contactPersons: ContactPerson[];
  proposedRent: number | null;
  proposedArea: number | null;
  frontage: string;
  noOfFloors: number | null;
  serviceFeeProposed: string;
  notes: string;
  password: string;
  propertyPhotos: string[];
  drawings: string[];
  cadDrawingUrl: string | null;
  propertyPresentation: string | null;
  propertySigningApplicable: boolean;
  propertyFeeEmailSent: boolean;
  propertyFeeEmailSentDate: string | null;
  propertyFeeAcceptanceEmailDate: string | null;
  propertyFeeNegotiationRequired: boolean;
  propertyFeePaperSigningDate: string | null;
  propertyFeeStatus: PropertyFeeStatus;
  propertyFeeFollowUpDate: string | null;
  propertyFeeFollowUpRemarks: string;
}

export interface Brand extends AuditFields {
  id: string;
  serialNo?: number;
  name: string;
  companyName: string;
  category: string;
  contactPersons: ContactPerson[];
  serviceFeeAgreed: string;
  assignedRep: string;
  logoUrl: string | null;
}

export interface SidvinTeamMember extends AuditFields {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
  role: UserRole;
  password: string;
}

export enum CurrentStageEnum {
  Draft = '1. Draft',
  PendingFollowUp = '2. Pending Follow Up',
  PendingVisitScheduling = '3. Pending Visit Scheduling',
  PendingVisit = '4. Pending Visit',
  PendingVisitAgain = '5. Pending Visit Again',
  PendingTermsFinalization = '6. Pending Terms Finalization',
  PendingAgreement = '7. Pending Agreement / Store Opening',
  PendingBrandFees = '8. Pending Brand Fees',
  CompletedProposal = '9. Success Stories'
}

export interface Proposal extends AuditFields {
  id: string;
  serialNo?: number;
  propertyId: string;
  brandId: string;
  currentStage: CurrentStageEnum;
  proposalDate: string | null;
  proposalSender: string;
  brandRemarks: string;
  invoiceStatus: boolean;
  invoiceNo: string;
  invoiceDate: string | null;
  invoiceAmount: number | null;
}

export interface FollowUp extends AuditFields {
  id: string;
  proposalId: string;
  followUpDate: string | null;
  remarks: string;
  status: 'Follow Up Again' | 'Schedule Visit' | 'Update' | 'Cancel Proposal' | 'Pending Details & Documentation';
  nextFollowUpDate: string | null;
  nextFollowUpTime: string | null;
  plannedVisitDate: string | null;
  cancelRemarks: string | null;
}

export interface Visit extends AuditFields {
  id: string;
  proposalId: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  meetingType: 'Physical' | 'Virtual' | null;
  meetingAgenda: string;
  meetingLink: string | null;
  visitDate: string | null;
  developerAttendees: string;
  brandAttendees: string;
  sidvinAttendees: string;
  visitOutcome: string;
}

export interface DepositStage {
  id: string;
  stageName: string;
  amount: number | null;
  received: boolean;
  receivedAmount?: number | null;
  receiptDate?: string | null;
  receipts?: DepositReceipt[];
}

export interface DepositReceipt {
  id: string;
  receiptDate: string | null;
  receiptAmount: number;
}

export interface TermSheetAgreement extends AuditFields {
  proposalId: string;
  specificTerms: string;
  leaseAgreementRemarks: string;
  handoverDate: string | null;
  rentFreePeriodDays: number | null;
  rentCommencementDate: string | null;
  plannedOpeningDate: string | null;
  preparationDate: string | null;
  finalizationDate: string | null;
  signingDate: string | null;
  advancePlan: string;
  agreementDate: string | null;
  agreementRegistrationRequired: boolean;
  agreementRegistrationDate: string | null;
  registrationFeePropertyShare: number | null;
  registrationFeeBrandShare: number | null;
  storeOpeningDate: string | null;
  depositStages: DepositStage[];

  ac: string;
  fireFightingSystem: string;
  flooring: string;
  lift: string;
  internalWalls: string;
  toilets: string;
  storeFront: string;
  glassFacadeGlazing: string;
  electricalPanel: string;
  powerLoad: string;
  dgBackup: string;
}
