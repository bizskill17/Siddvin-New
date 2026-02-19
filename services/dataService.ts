import {
  Property,
  Brand,
  Proposal,
  Visit,
  TermSheetAgreement,
  CurrentStageEnum,
  ContactPerson,
  SidvinTeamMember,
  FollowUp,
} from '../types';

let properties: Property[] = [];
let brands: Brand[] = [];
let proposals: Proposal[] = [];
let visits: Visit[] = [];
let termSheetAgreements: TermSheetAgreement[] = [];
let sidvinTeamMembers: SidvinTeamMember[] = [];
let followUps: FollowUp[] = []; // New: FollowUps

// Helper to generate unique IDs (mimicking UNIQUEID() in AppSheet)
const uniqueId = (): string => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Helper to check if a string/date is not blank
const isNotBlank = (value: string | number | boolean | null | undefined): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0 && value !== null;
  return value !== null && value !== undefined && value !== '';
};

// --- Current Stage Calculation ---
export const calculateCurrentStage = (
  proposal: Proposal,
  allVisits: Visit[],
  allTermSheets: TermSheetAgreement[],
  allFollowUps: FollowUp[],
): CurrentStageEnum => {
  const proposalVisits = allVisits.filter(v => v.proposalId === proposal.id);
  const proposalTermSheet = allTermSheets.find(ts => ts.proposalId === proposal.id);
  const proposalFollowUps = allFollowUps.filter(fu => fu.proposalId === proposal.id);

  // Evaluate milestones in reverse order of progression (highest stage first)

  // 10. Completed Proposal (Agreement Registered + Store Opened + Invoice Recorded)
  if (
    isNotBlank(proposalTermSheet?.agreementRegistrationDate) &&
    isNotBlank(proposalTermSheet?.storeOpeningDate) &&
    proposal.invoiceStatus === true
  ) {
    return CurrentStageEnum.CompletedProposal;
  }

  // 9. Pending Brand Fees (Both Agreement Registered AND Store Opened, but invoice not recorded)
  if (isNotBlank(proposalTermSheet?.agreementRegistrationDate) && isNotBlank(proposalTermSheet?.storeOpeningDate)) {
    return CurrentStageEnum.PendingBrandFees;
  }

  // 8. Pending Agreement / Store Opening:
  // If LOI/Terms are finalized and either agreement registration or store opening is still pending.
  if (
    isNotBlank(proposalTermSheet?.loiTermSheetDate) &&
    (!isNotBlank(proposalTermSheet?.agreementRegistrationDate) || !isNotBlank(proposalTermSheet?.storeOpeningDate))
  ) {
    return CurrentStageEnum.PendingAgreement;
  }

  // 7. Pending Terms Finalization (Rate Finalized, but Terms Not Finalized)
  if (proposal.rateFinalized === true && !isNotBlank(proposalTermSheet?.loiTermSheetDate)) {
    return CurrentStageEnum.PendingTermsFinalization;
  }

  const hasCompletedVisit = proposalVisits.some(v => isNotBlank(v.visitDate));
  const hasScheduledUncompletedVisit = proposalVisits.some(v => isNotBlank(v.scheduledDate) && !isNotBlank(v.visitDate));

  // 5. Pending Visit Again (At least one visit completed, and another visit has been scheduled before rate finalization)
  if (hasCompletedVisit && hasScheduledUncompletedVisit && proposal.rateFinalized === false) {
    return CurrentStageEnum.PendingVisitAgain;
  }

  // 6. Pending Rate Finalization (Visit Completed, but no new visit scheduled and rate not finalized)
  if (hasCompletedVisit && proposal.rateFinalized === false) {
    return CurrentStageEnum.PendingRateFinalization;
  }

  // 4. Pending Visit (First visit scheduled, but not completed)
  if (hasScheduledUncompletedVisit && !hasCompletedVisit) {
    return CurrentStageEnum.PendingVisit;
  }

  // 3. Pending Visit Scheduling (Follow-up indicates decision to schedule a visit, but visit not yet scheduled)
  if (
    isNotBlank(proposal.proposalDate) &&
    !proposalVisits.some(v => isNotBlank(v.scheduledDate)) &&
    proposalFollowUps.some(fu => fu.status === 'Schedule Visit')
  ) {
    return CurrentStageEnum.PendingVisitScheduling;
  }

  // 2. Pending Follow Up (Proposal Sent and no visit scheduled yet).
  // This is the immediate stage after creating/sending a proposal.
  if (isNotBlank(proposal.proposalDate) && !proposalVisits.some(v => isNotBlank(v.scheduledDate))) {
    return CurrentStageEnum.PendingFollowUp;
  }

  // 1. Draft (Proposal not yet sent)
  if (!isNotBlank(proposal.proposalDate)) {
    return CurrentStageEnum.Draft;
  }

  // Default if none of the above match (should ideally not be reached if logic is comprehensive)
  // This means the proposal has been sent but no specific next steps are identified yet.
  return CurrentStageEnum.Draft;
};

// --- Data Initialization (for demonstration) ---
export const initializeDemoData = () => {
  // Clear existing data
  properties = [];
  brands = [];
  proposals = [];
  visits = [];
  termSheetAgreements = [];
  sidvinTeamMembers = [];
  followUps = [];

  // Add some demo Sidvin Team Members
  const rep1Id = uniqueId();
  const rep2Id = uniqueId();
  const rep3Id = uniqueId();
  sidvinTeamMembers.push({
    id: rep1Id,
    name: 'Sidvin Rep 1',
    designation: 'Sales Executive',
    mobile: '1112223333',
    email: 'rep1@sidvin.com',
    role: 'Employee',
    password: 'password123'
  });
  sidvinTeamMembers.push({
    id: rep2Id,
    name: 'Sidvin Admin',
    designation: 'Sales Manager',
    mobile: '4445556666',
    email: 'admin@sidvin.com',
    role: 'Admin',
    password: 'adminpassword'
  });
  sidvinTeamMembers.push({
    id: rep3Id,
    name: 'Sidvin Associate',
    designation: 'Sales Associate',
    mobile: '7778889999',
    email: 'associate@sidvin.com',
    role: 'Employee',
    password: 'securepassword'
  });


  // Add some demo properties
  const prop1Id = uniqueId();
  const prop2Id = uniqueId();
  properties.push({
    id: prop1Id,
    address: '123 Main St, Anytown',
    googleMapsLink: 'https://maps.google.com/?q=123+Main+St',
    contactPersons: [{
      id: uniqueId(),
      name: 'Alice Wonderland',
      designation: 'Owner',
      mobile: '9876543210',
      email: 'alice@example.com',
    }],
    proposedRent: 50000,
    proposedArea: 1200,
    serviceFeeProposed: '10%',
    notes: 'Standard 3-year lease, 5% annual increase.',
    password: 'proppassword1'
  });
  properties.push({
    id: prop2Id,
    address: '456 Oak Ave, Otherville',
    googleMapsLink: null,
    contactPersons: [{
      id: uniqueId(),
      name: 'Bob The Builder',
      designation: 'Developer',
      mobile: '1234567890',
      email: 'bob@example.com',
    }],
    proposedRent: 75000,
    proposedArea: 1800,
    serviceFeeProposed: '12%',
    notes: '5-year lease, 7% annual increase, 3 months rent-free.',
    password: 'proppassword2'
  });

  // Add some demo brands
  const brand1Id = uniqueId();
  const brand2Id = uniqueId();
  brands.push({
    id: brand1Id,
    name: 'Fashion Hub',
    contactPersons: [{
      id: uniqueId(),
      name: 'Charlie Chaplin',
      designation: 'Head of Expansion',
      mobile: '5551112222',
      email: 'charlie@fashionhub.com',
    }],
    serviceFeeAgreed: '9%',
    assignedRep: 'rep1@sidvin.com',
    logoUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-fashion-2652618-2200371.png?f=webp&w=256'
  });
  brands.push({
    id: brand2Id,
    name: 'Gourmet Bites',
    contactPersons: [{
      id: uniqueId(),
      name: 'Diana Prince',
      designation: 'Franchise Manager',
      mobile: '5553334444',
      email: 'diana@gourmetbites.com',
    }],
    serviceFeeAgreed: '11%',
    assignedRep: 'admin@sidvin.com',
    logoUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-food-1851216-1569427.png?f=webp&w=256'
  });

  // Add some demo proposals
  // Proposal 1: Draft
  const proposal1Id = uniqueId();
  proposals.push({
    id: proposal1Id,
    propertyId: prop1Id,
    brandId: brand1Id,
    currentStage: CurrentStageEnum.Draft, // Will be recalculated
    proposalDate: null,
    proposalSender: 'sidvin.sales@sidvin.com',
    brandRemarks: '',
    specificDetailsRequiredByBrand: '',
    detailsSentStatus: false,
    rateFinalized: false,
    invoiceStatus: false
  });

  // Proposal 2: Pending Follow Up (Proposal sent, follow-up scheduled)
  const proposal2Id = uniqueId();
  proposals.push({
    id: proposal2Id,
    propertyId: prop2Id,
    brandId: brand2Id,
    currentStage: CurrentStageEnum.Draft, // Will be recalculated
    proposalDate: '2023-10-01',
    proposalSender: 'sidvin.sales@sidvin.com',
    brandRemarks: 'Brand interested, needs more info on property layout.',
    specificDetailsRequiredByBrand: 'Detailed floor plans, photos.',
    detailsSentStatus: true,
    rateFinalized: false,
    invoiceStatus: false
  });
  followUps.push({
    id: uniqueId(),
    proposalId: proposal2Id,
    followUpDate: '2023-10-15',
    remarks: 'Initial follow-up call to provide requested floor plans.',
    status: 'Follow Up Again',
    nextFollowUpDate: '2023-10-22',
    plannedVisitDate: null,
    cancelRemarks: null,
  });

  // Proposal 3: Pending Visit (Visit Scheduled, but not completed)
  const proposal3Id = uniqueId();
  proposals.push({
    id: proposal3Id,
    propertyId: prop1Id,
    brandId: brand2Id,
    currentStage: CurrentStageEnum.Draft, // Will be recalculated
    proposalDate: '2023-09-15',
    proposalSender: 'sidvin.sales@sidvin.com',
    brandRemarks: 'Brand expressed strong interest after initial details.',
    specificDetailsRequiredByBrand: '',
    detailsSentStatus: true,
    rateFinalized: false,
    invoiceStatus: false
  });
  visits.push({
    id: uniqueId(),
    proposalId: proposal3Id,
    scheduledDate: '2023-10-10',
    scheduledTime: '10:00',
    visitDate: null, // Not completed yet
    developerAttendees: '',
    brandAttendees: '',
    sidvinAttendees: '',
    visitOutcome: '',
  });

  // Proposal 4: Pending Rate Finalization (Visit completed, but rate not yet finalized)
  const proposal4Id = uniqueId();
  proposals.push({
    id: proposal4Id,
    propertyId: prop2Id,
    brandId: brand1Id,
    currentStage: CurrentStageEnum.Draft, // Will be recalculated
    proposalDate: '2023-08-20',
    proposalSender: 'sidvin.sales@sidvin.com',
    brandRemarks: 'Visit successful, discussing commercial terms.',
    specificDetailsRequiredByBrand: 'Best and final offer structure.',
    detailsSentStatus: true,
    rateFinalized: false,
    invoiceStatus: false
  });
  visits.push({
    id: uniqueId(),
    proposalId: proposal4Id,
    scheduledDate: '2023-09-01',
    scheduledTime: '11:00',
    visitDate: '2023-09-01', // Completed
    developerAttendees: 'Developer Rep',
    brandAttendees: 'Brand Head',
    sidvinAttendees: 'Sidvin Rep 1',
    visitOutcome: 'Good discussion, positive interest. Awaiting financial proposal.',
  });

  // Proposal 5: Pending Terms Finalization (Rate finalized, but term sheet not yet drafted/sent)
  const proposal5Id = uniqueId();
  proposals.push({
    id: proposal5Id,
    propertyId: prop1Id,
    brandId: brand1Id,
    currentStage: CurrentStageEnum.Draft, // Will be recalculated
    proposalDate: '2023-07-10',
    proposalSender: 'sidvin.sales@sidvin.com',
    brandRemarks: 'Rate agreed, preparing LOI.',
    specificDetailsRequiredByBrand: '',
    detailsSentStatus: true,
    rateFinalized: true,
    invoiceStatus: false
  });

  // Proposal 6: Pending Agreement (Terms finalized, but agreement not registered)
  const proposal6Id = uniqueId();
  proposals.push({
    id: proposal6Id,
    propertyId: prop2Id,
    brandId: brand2Id,
    currentStage: CurrentStageEnum.Draft, // Will be recalculated
    proposalDate: '2023-06-01',
    proposalSender: 'sidvin.sales@sidvin.com',
    brandRemarks: 'LOI signed, proceeding to agreement.',
    specificDetailsRequiredByBrand: '',
    detailsSentStatus: true,
    rateFinalized: true,
    invoiceStatus: false
  });
  termSheetAgreements.push({
    proposalId: proposal6Id,
    specificTerms: 'Standard 3+2 year lease. 3 months rent-free.',
    handoverDate: '2024-01-01',
    rentFreePeriodDays: 90,
    rentCommencementDate: '2024-04-01',
    plannedOpeningDate: '2024-05-15',
    loiTermSheetDate: '2023-11-15', // Terms Finalized
    advancePlan: '2 months security deposit + 1 month advance rent',
    agreementDate: null, // Agreement not yet signed
    agreementRegistrationDate: null,
    storeOpeningDate: null,
    ac: 'VRF ready', fireFightingSystem: 'Sprinklers', flooring: 'Bare shell', lift: 'Cargo lift', internalWalls: 'No', toilets: 'Common', storeFront: 'Glass', glassFacadeGlazing: 'Double', electricalPanel: '100A', powerLoad: '70kW', dgBackup: 'Yes'
  });

  // Proposal 7: Pending Store Opening (Agreement Registered, but Store not opened)
  const proposal7Id = uniqueId();
  proposals.push({
    id: proposal7Id,
    propertyId: prop1Id,
    brandId: brand1Id,
    currentStage: CurrentStageEnum.Draft, // Will be recalculated
    proposalDate: '2023-05-01',
    proposalSender: 'sidvin.sales@sidvin.com',
    brandRemarks: 'Agreement executed, awaiting store fit-out and opening.',
    specificDetailsRequiredByBrand: '',
    detailsSentStatus: true,
    rateFinalized: true,
    invoiceStatus: false
  });
  termSheetAgreements.push({
    proposalId: proposal7Id,
    specificTerms: '5-year lease. 2 months rent-free.',
    handoverDate: '2023-12-01',
    rentFreePeriodDays: 60,
    rentCommencementDate: '2024-02-01',
    plannedOpeningDate: '2024-03-30',
    loiTermSheetDate: '2023-09-01',
    advancePlan: '3 months security deposit',
    agreementDate: '2023-10-15',
    agreementRegistrationDate: '2023-11-01', // Agreement Registered
    storeOpeningDate: null, // Store not yet opened
    ac: 'Split AC', fireFightingSystem: 'Fire alarm', flooring: 'Tiles', lift: 'Passenger lift', internalWalls: 'Painted', toilets: 'Private', storeFront: 'Aluminium', glassFacadeGlazing: 'Single', electricalPanel: '50A', powerLoad: '30kW', dgBackup: 'Partial'
  });


  // Recalculate all proposal stages after initializing all related data
  proposals = proposals.map(p => ({
    ...p,
    currentStage: calculateCurrentStage(p, visits, termSheetAgreements, followUps)
  }));
};

// --- CRUD Operations ---

// Properties
export const getProperties = (): Property[] => [...properties];
export const addProperty = (newProperty: Omit<Property, 'id'>): Property => {
  const property: Property = { id: uniqueId(), ...newProperty };
  properties.push(property);
  return property;
};
export const updateProperty = (updatedProperty: Property): Property => {
  const index = properties.findIndex(p => p.id === updatedProperty.id);
  if (index !== -1) {
    properties[index] = updatedProperty;
  }
  return updatedProperty;
};
export const deleteProperty = (id: string): boolean => {
  const hasProposals = proposals.some(p => p.propertyId === id);
  if (hasProposals) {
    throw new Error('Cannot delete property: It is referenced by existing proposals.');
  }
  const initialLength = properties.length;
  properties = properties.filter(p => p.id !== id);
  return properties.length < initialLength;
};

// Brands
export const getBrands = (): Brand[] => [...brands];
export const addBrand = (newBrand: Omit<Brand, 'id'>): Brand => {
  const brand: Brand = { id: uniqueId(), ...newBrand };
  brands.push(brand);
  return brand;
};
export const updateBrand = (updatedBrand: Brand): Brand => {
  const index = brands.findIndex(b => b.id === updatedBrand.id);
  if (index !== -1) {
    brands[index] = updatedBrand;
  }
  return updatedBrand;
};
export const deleteBrand = (id: string): boolean => {
  const hasProposals = proposals.some(p => p.brandId === id);
  if (hasProposals) {
    throw new Error('Cannot delete brand: It is referenced by existing proposals.');
  }
  const initialLength = brands.length;
  brands = brands.filter(b => b.id !== id);
  return brands.length < initialLength;
};

// Sidvin Team Members
export const getSidvinTeamMembers = (): SidvinTeamMember[] => [...sidvinTeamMembers];
export const addSidvinTeamMember = (newMember: Omit<SidvinTeamMember, 'id'>): SidvinTeamMember => {
  const member: SidvinTeamMember = { id: uniqueId(), ...newMember };
  sidvinTeamMembers.push(member);
  return member;
};
export const updateSidvinTeamMember = (updatedMember: SidvinTeamMember): SidvinTeamMember => {
  const index = sidvinTeamMembers.findIndex(m => m.id === updatedMember.id);
  if (index !== -1) {
    sidvinTeamMembers[index] = updatedMember;
  }
  return updatedMember;
};
export const deleteSidvinTeamMember = (id: string): boolean => {
  const memberToDelete = sidvinTeamMembers.find(m => m.id === id);
  if (memberToDelete) {
    const isAssignedRep = brands.some(b => b.assignedRep === memberToDelete.email);
    if (isAssignedRep) {
      throw new Error(`Cannot delete team member: ${memberToDelete.name} is assigned as a representative to existing brands.`);
    }
    const isAttendee = visits.some(v => v.sidvinAttendees.includes(memberToDelete.name));
    if (isAttendee) {
      throw new Error(`Cannot delete team member: ${memberToDelete.name} is listed as an attendee in existing visits.`);
    }
  }
  const initialLength = sidvinTeamMembers.length;
  sidvinTeamMembers = sidvinTeamMembers.filter(m => m.id !== id);
  return sidvinTeamMembers.length < initialLength;
};


// Proposals
export const getProposals = (): Proposal[] => {
  // Always recalculate stages before returning, to ensure they are up-to-date
  return proposals.map(p => ({
    ...p,
    currentStage: calculateCurrentStage(p, visits, termSheetAgreements, followUps)
  }));
};
export const getProposalById = (id: string): Proposal | undefined => {
  const proposal = proposals.find(p => p.id === id);
  if (proposal) {
    return { ...proposal, currentStage: calculateCurrentStage(proposal, visits, termSheetAgreements, followUps) };
  }
  return undefined;
};
export const addProposal = (newProposal: Omit<Proposal, 'id' | 'currentStage'>): Proposal => {
  const proposal: Proposal = {
    id: uniqueId(),
    ...newProposal,
    invoiceStatus: newProposal.invoiceStatus ?? false,
    currentStage: CurrentStageEnum.Draft // Will be set after all data is in place
  };
  proposals.push(proposal);
  // Recalculate stage immediately after adding
  proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
  return proposal;
};
export const updateProposal = (updatedProposal: Proposal): Proposal => {
  const index = proposals.findIndex(p => p.id === updatedProposal.id);
  if (index !== -1) {
    proposals[index] = {
      ...updatedProposal,
      currentStage: calculateCurrentStage(updatedProposal, visits, termSheetAgreements, followUps)
    };
  }
  return proposals[index];
};

export const updateProposalInvoiceStatus = (proposalId: string, invoiceStatus: boolean): Proposal | undefined => {
  const proposal = proposals.find(p => p.id === proposalId);
  if (!proposal) return undefined;
  proposal.invoiceStatus = invoiceStatus;
  proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
  return proposal;
};
export const deleteProposal = (id: string): boolean => {
  const initialLength = proposals.length;
  proposals = proposals.filter(p => p.id !== id);
  // Cascade delete related entities
  visits = visits.filter(v => v.proposalId !== id);
  followUps = followUps.filter(fu => fu.proposalId !== id);
  termSheetAgreements = termSheetAgreements.filter(ts => ts.proposalId !== id);
  return proposals.length < initialLength;
};


// Follow Ups (NEW)
export const getFollowUps = (): FollowUp[] => [...followUps];
export const getFollowUpsByProposalId = (proposalId: string): FollowUp[] => {
  return followUps.filter(fu => fu.proposalId === proposalId);
};
export const addFollowUp = (newFollowUp: Omit<FollowUp, 'id'>): FollowUp => {
  const followUp: FollowUp = { id: uniqueId(), ...newFollowUp };
  followUps.push(followUp);
  const proposal = proposals.find(p => p.id === newFollowUp.proposalId);
  if (proposal) {
    proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
  }
  return followUp;
};
export const updateFollowUp = (updatedFollowUp: FollowUp): FollowUp => {
  const index = followUps.findIndex(fu => fu.id === updatedFollowUp.id);
  if (index !== -1) {
    followUps[index] = updatedFollowUp;
    const proposal = proposals.find(p => p.id === updatedFollowUp.proposalId);
    if (proposal) {
      proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
    }
  }
  return updatedFollowUp;
};
export const deleteFollowUp = (id: string): boolean => {
  const followUpToDelete = followUps.find(fu => fu.id === id);
  const initialLength = followUps.length;
  followUps = followUps.filter(fu => fu.id !== id);
  if (followUpToDelete) { // Recalculate stage for the associated proposal
    const proposal = proposals.find(p => p.id === followUpToDelete.proposalId);
    if (proposal) {
      proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
    }
  }
  return followUps.length < initialLength;
};


// Visits
export const getVisits = (): Visit[] => [...visits];
export const getVisitsByProposalId = (proposalId: string): Visit[] => {
  return visits.filter(v => v.proposalId === proposalId);
};
export const addVisit = (newVisit: Omit<Visit, 'id'>): Visit => {
  const visit: Visit = { id: uniqueId(), ...newVisit };
  visits.push(visit);
  // Trigger proposal stage recalculation
  const proposal = proposals.find(p => p.id === newVisit.proposalId);
  if (proposal) {
    proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
  }
  return visit;
};
export const updateVisit = (updatedVisit: Visit): Visit => {
  const index = visits.findIndex(v => v.id === updatedVisit.id);
  if (index !== -1) {
    visits[index] = updatedVisit;
    // Trigger proposal stage recalculation
    const proposal = proposals.find(p => p.id === updatedVisit.proposalId);
    if (proposal) {
      proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
    }
  }
  return updatedVisit;
};
export const deleteVisit = (id: string): boolean => {
  const visitToDelete = visits.find(v => v.id === id);
  const initialLength = visits.length;
  visits = visits.filter(v => v.id !== id);
  if (visitToDelete) { // Recalculate stage for the associated proposal
    const proposal = proposals.find(p => p.id === visitToDelete.proposalId);
    if (proposal) {
      proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
    }
  }
  return visits.length < initialLength;
};

// Term Sheet & Agreement
export const getTermSheetAgreements = (): TermSheetAgreement[] => [...termSheetAgreements];
export const getTermSheetByProposalId = (proposalId: string): TermSheetAgreement | undefined => {
  return termSheetAgreements.find(ts => ts.proposalId === proposalId);
};
export const addOrUpdateTermSheet = (termSheet: TermSheetAgreement): TermSheetAgreement => {
  const index = termSheetAgreements.findIndex(ts => ts.proposalId === termSheet.proposalId);
  if (index !== -1) {
    termSheetAgreements[index] = termSheet;
  } else {
    termSheetAgreements.push(termSheet);
  }
  // Trigger proposal stage recalculation
  const proposal = proposals.find(p => p.id === termSheet.proposalId);
  if (proposal) {
    proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
  }
  return termSheet;
};
export const updateAgreementDates = (
  proposalId: string,
  agreementDate: string | null,
  agreementRegistrationDate: string | null
): TermSheetAgreement | undefined => {
  const termSheet = termSheetAgreements.find(ts => ts.proposalId === proposalId);
  if (termSheet) {
    termSheet.agreementDate = agreementDate;
    termSheet.agreementRegistrationDate = agreementRegistrationDate;
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal) {
      proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
    }
    return termSheet;
  }
  return undefined;
};
export const updateStoreOpeningDate = (
  proposalId: string,
  storeOpeningDate: string | null
): TermSheetAgreement | undefined => {
  const termSheet = termSheetAgreements.find(ts => ts.proposalId === proposalId);
  if (termSheet) {
    termSheet.storeOpeningDate = storeOpeningDate;
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal) {
      proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
    }
    return termSheet;
  }
  return undefined;
};
export const deleteTermSheet = (proposalId: string): boolean => {
  const initialLength = termSheetAgreements.length;
  termSheetAgreements = termSheetAgreements.filter(ts => ts.proposalId !== proposalId);
  const proposal = proposals.find(p => p.id === proposalId);
  if (proposal) { // Recalculate stage for the associated proposal
    proposal.currentStage = calculateCurrentStage(proposal, visits, termSheetAgreements, followUps);
  }
  return termSheetAgreements.length < initialLength;
};


// Initial data load when the service is imported
initializeDemoData();
