import {
  Property,
  Brand,
  Proposal,
  Visit,
  TermSheetAgreement,
  CurrentStageEnum,
  SidvinTeamMember,
  FollowUp,
} from '../types';

// Backend API base URL (Node + MySQL). This replaces the old Google Apps Script backend.
// Set `VITE_BACKEND_URL` in your environment for production, e.g. `https://proposal.bizskilledu.com/api`.
const DEFAULT_DEV_BACKEND_URL = 'http://localhost:4000/api';
export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim() ||
  (import.meta.env.DEV ? DEFAULT_DEV_BACKEND_URL : '/api');

type EntityName =
  | 'Properties'
  | 'Brands'
  | 'Proposals'
  | 'Visits'
  | 'FollowUps'
  | 'TermSheets'
  | 'SidvinTeam'
  | 'SidvinTeamMembers'
  | 'Sidvin Team Members'
  | 'CompanyMaster'
  | 'CategoryMaster';

const ENTITY_MAP = {
  properties: 'Properties',
  brands: 'Brands',
  proposals: 'Proposals',
  visits: 'Visits',
  followUps: 'FollowUps',
  termSheets: 'TermSheets',
  sidvinTeam: 'SidvinTeam',
  companyMaster: 'CompanyMaster',
  categoryMaster: 'CategoryMaster',
} as const;

const qs = (params: Record<string, string>) => {
  const usp = new URLSearchParams(params);
  return `${BACKEND_URL}?${usp.toString()}`;
};

const getJson = async <T>(url: string): Promise<T> => {
  const sep = url.includes('?') ? '&' : '?';
  const noCacheUrl = `${url}${sep}_ts=${Date.now()}`;
  const res = await fetch(noCacheUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Backend request failed: ${res.status}`);
  const raw = await res.text();
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    const shortBody = raw.slice(0, 140).replace(/\s+/g, ' ').trim();
    throw new Error(`Backend returned non-JSON. Check Apps Script deployment/doGet. Response: ${shortBody}`);
  }
  if (json?.ok === false) throw new Error(json.error || 'Backend error');
  return json;
};

const postJson = async <T>(body: any): Promise<T> => {
  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    // Use text/plain to keep the request "simple" and avoid Apps Script CORS preflight issues.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    cache: 'no-store',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Backend request failed: ${res.status}`);
  const raw = await res.text();
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    const shortBody = raw.slice(0, 140).replace(/\s+/g, ' ').trim();
    throw new Error(`Backend returned non-JSON. Check Apps Script deployment/doPost. Response: ${shortBody}`);
  }
  if (json?.ok === false) throw new Error(json.error || 'Backend error');
  return json;
};

const cleanArray = <T>(v: any): T[] => (Array.isArray(v) ? v : []);
const toCleanString = (value: any): string => (value === null || value === undefined ? '' : String(value).trim());
const toBool = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return !!value;
};
const parseSerial = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return value;
  const str = String(value);
  const match = str.match(/(\d+)$/);
  return match ? Number(match[1]) : undefined;
};

const fromSheetDate = (value: any): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return v;
};

const toSheetDate = (value: any): string => {
  if (value === null || value === undefined || value === '') return '';
  const v = String(value);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [yyyy, mm, dd] = v.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return v;
};

const toSheetTime = (value: any): string => {
  if (value === null || value === undefined || value === '') return '';
  const v = String(value);
  if (/^\d{2}:\d{2}$/.test(v)) return v;
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v.substring(0, 5);
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    const hh = String(parsed.getHours()).padStart(2, '0');
    const mm = String(parsed.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return v;
};

const normalizeTimeValue = (value: any): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value);
  
  // 1. If it matches HH:mm, return it
  if (/^\d{2}:\d{2}$/.test(v)) return v;
  
  // 2. If it matches HH:mm:ss, return HH:mm
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v.substring(0, 5);

  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    const hh = String(parsed.getHours()).padStart(2, '0');
    const mm = String(parsed.getMinutes()).padStart(2, '0');
    
    // Detect the 1899 timezone bug (IST +05:21)
    // If it's year 1899 and the time is 05:21, it means the backend 
    // sent a date-only string "1899-12-30" which has no time info.
    if (parsed.getFullYear() === 1899 && hh === '05' && mm === '21') {
      return null;
    }
    
    return `${hh}:${mm}`;
  }
  return v;
};

const derivePropertyFeeStatus = (p: any): Property['propertyFeeStatus'] => {
  const emailSentDate = fromSheetDate(p.propertyFeeEmailSentDate);
  const acceptanceDate = fromSheetDate(p.propertyFeeAcceptanceEmailDate);
  const paperSigningDate = fromSheetDate(p.propertyFeePaperSigningDate);
  const negotiationRequired = toBool(p.propertyFeeNegotiationRequired);
  const signingApplicable = toBool(p.propertySigningApplicable);

  if (!emailSentDate) return 'Pending Property Email';
  if (!acceptanceDate) {
    return negotiationRequired ? 'Pending Negotiation' : 'Pending Acceptance Email';
  }
  if (signingApplicable && !paperSigningDate) return 'Pending MOU Signing';
  return 'Accepted & Signed';
};

const normalizeProperty = (p: any): Property => ({
  ...p,
  serialNo: parseSerial(p.serialNo),
  proposedRent: p.proposedRent === null ? null : (p.proposedRent === '' || p.proposedRent === undefined ? null : Number(p.proposedRent)),
  proposedArea: p.proposedArea === null ? null : (p.proposedArea === '' || p.proposedArea === undefined ? null : Number(p.proposedArea)),
  noOfFloors: p.noOfFloors === null ? null : (p.noOfFloors === '' || p.noOfFloors === undefined ? null : Number(p.noOfFloors)),
  frontage: p.frontage === null || p.frontage === undefined ? '' : String(p.frontage),
  propertyPhotos: cleanArray<string>(p.propertyPhotosJson || p.propertyPhotos),
  drawings: cleanArray<string>(p.drawingsJson || p.drawings),
  cadDrawingUrl: p.cadDrawingUrl || null,
  contactPersons: cleanArray(p.contactPersonsJson || p.contactPersons),
  propertySigningApplicable: toBool(p.propertySigningApplicable),
  propertyFeeEmailSent: toBool(p.propertyFeeEmailSent) || !!fromSheetDate(p.propertyFeeEmailSentDate),
  propertyFeeEmailSentDate: fromSheetDate(p.propertyFeeEmailSentDate),
  propertyFeeAcceptanceEmailDate: fromSheetDate(p.propertyFeeAcceptanceEmailDate),
  propertyFeeNegotiationRequired: toBool(p.propertyFeeNegotiationRequired),
  propertyFeePaperSigningDate: fromSheetDate(p.propertyFeePaperSigningDate),
  propertyFeeStatus: derivePropertyFeeStatus(p),
  propertyFeeFollowUpDate: fromSheetDate(p.propertyFeeFollowUpDate),
});

const normalizeBrand = (b: any): Brand => ({
  ...b,
  serialNo: parseSerial(b.serialNo),
  companyName: b.companyName || '',
  category: b.category || '',
  contactPersons: cleanArray(b.contactPersonsJson || b.contactPersons),
});

const normalizeProposal = (p: any): Proposal => {
  let currentStage = (p.currentStage || CurrentStageEnum.Draft) as CurrentStageEnum;
  if (p.currentStage === '9. Completed Proposal') currentStage = CurrentStageEnum.CompletedProposal;
  return {
    ...p,
    serialNo: parseSerial(p.serialNo),
    invoiceStatus: toBool(p.invoiceStatus),
    proposalDate: fromSheetDate(p.proposalDate),
    invoiceDate: fromSheetDate(p.invoiceDate),
    invoiceAmount: p.invoiceAmount === null ? null : (p.invoiceAmount === '' || p.invoiceAmount === undefined ? null : Number(p.invoiceAmount)),
    currentStage,
  };
};

const normalizeVisit = (v: any): Visit => ({
  ...v,
  scheduledDate: fromSheetDate(v.scheduledDate),
  scheduledTime: normalizeTimeValue(v.scheduledTime),
  meetingType:
    v.meetingType === 'Physical' || v.meetingType === 'Virtual'
      ? v.meetingType
      : null,
  meetingAgenda: toCleanString(v.meetingAgenda),
  meetingLink: toCleanString(v.meetingLink || v.virtualMeetingLink || v.link) || null,
  visitDate: fromSheetDate(v.visitDate),
});
const normalizeFollowUp = (f: any): FollowUp => ({
  ...f,
  followUpDate: fromSheetDate(f.followUpDate),
  nextFollowUpDate: fromSheetDate(f.nextFollowUpDate),
  nextFollowUpTime: normalizeTimeValue(f.nextFollowUpTime),
  plannedVisitDate: fromSheetDate(f.plannedVisitDate),
});

const normalizeTermSheet = (t: any): TermSheetAgreement => ({
  ...t,
  leaseAgreementRemarks: t.leaseAgreementRemarks || '',
  handoverDate: fromSheetDate(t.handoverDate),
  rentCommencementDate: fromSheetDate(t.rentCommencementDate),
  plannedOpeningDate: fromSheetDate(t.plannedOpeningDate),
  preparationDate: fromSheetDate(t.preparationDate),
  finalizationDate: fromSheetDate(t.finalizationDate),
  signingDate: fromSheetDate(t.signingDate),
  agreementDate: fromSheetDate(t.agreementDate),
  agreementRegistrationDate: fromSheetDate(t.agreementRegistrationDate),
  storeOpeningDate: fromSheetDate(t.storeOpeningDate),
  rentFreePeriodDays: t.rentFreePeriodDays === null ? null : (t.rentFreePeriodDays === '' || t.rentFreePeriodDays === undefined ? null : Number(t.rentFreePeriodDays)),
  registrationFeePropertyShare: t.registrationFeePropertyShare === null ? null : (t.registrationFeePropertyShare === '' || t.registrationFeePropertyShare === undefined ? null : Number(t.registrationFeePropertyShare)),
  registrationFeeBrandShare: t.registrationFeeBrandShare === null ? null : (t.registrationFeeBrandShare === '' || t.registrationFeeBrandShare === undefined ? null : Number(t.registrationFeeBrandShare)),
  agreementRegistrationRequired: toBool(t.agreementRegistrationRequired),
  depositStages: cleanArray(t.depositStagesJson || t.depositStages),
});

const normalizeMember = (m: any): SidvinTeamMember => ({
  ...m,
  id: toCleanString(m?.id),
  name: toCleanString(m?.name),
  designation: toCleanString(m?.designation),
  mobile: toCleanString(m?.mobile),
  email: toCleanString(m?.email),
  role: toCleanString(m?.role) as SidvinTeamMember['role'],
  password: toCleanString(m?.password),
  createdAt: m?.createdAt ? String(m.createdAt) : undefined,
  updatedAt: m?.updatedAt ? String(m.updatedAt) : undefined,
  updatedBy: m?.updatedBy ? String(m.updatedBy) : undefined,
});

const normalizeMasterOption = (m: any): MasterOptionItem => ({
  id: toCleanString(m?.id),
  name: toCleanString(m?.name),
  createdAt: m?.createdAt ? String(m.createdAt) : undefined,
  updatedAt: m?.updatedAt ? String(m.updatedAt) : undefined,
  updatedBy: m?.updatedBy ? String(m.updatedBy) : undefined,
});

const getNextSerialNoForEntity = async (entity: EntityName): Promise<number> => {
  const rows = await listEntity(entity);
  let maxSerial = 0;
  for (const row of rows) {
    const serial = parseSerial((row as any)?.serialNo);
    if (serial && serial > maxSerial) maxSerial = serial;
  }
  return maxSerial + 1;
};

export const initializeDemoData = () => {
  // no-op: backend is source of truth
};

const listEntity = async (entity: EntityName): Promise<any[]> => {
  const res: any = await getJson(qs({ action: 'list', entity }));
  return Array.isArray(res.data) ? res.data : [];
};

const listEntityWithFallback = async (entities: EntityName[]): Promise<any[]> => {
  let lastError: any;
  for (const entity of entities) {
    try {
      return await listEntity(entity);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Unable to fetch entity.');
};

const postJsonWithEntityFallback = async <T>(
  body: { entity: EntityName;[key: string]: any },
  entities: EntityName[],
): Promise<T> => {
  let lastError: any;
  for (const entity of entities) {
    try {
      return await postJson<T>({ ...body, entity });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Unable to submit entity payload.');
};

export const calculateCurrentStage = (
  proposal: Proposal,
  allVisits: Visit[],
  allTermSheets: TermSheetAgreement[],
  allFollowUps: FollowUp[],
): CurrentStageEnum => {
  const proposalVisits = allVisits.filter(v => v.proposalId === proposal.id);
  const proposalTermSheet = allTermSheets.find(ts => ts.proposalId === proposal.id);
  const proposalFollowUps = allFollowUps.filter(fu => fu.proposalId === proposal.id);

  const invoiceBilled = !!proposal.invoiceNo && !!proposal.invoiceDate && proposal.invoiceAmount !== null;
  if (invoiceBilled) return CurrentStageEnum.CompletedProposal;

  if (proposalTermSheet?.signingDate) {
    const registrationSatisfied = !proposalTermSheet.agreementRegistrationRequired || !!proposalTermSheet.agreementRegistrationDate;
    if (registrationSatisfied && !!proposalTermSheet.storeOpeningDate) return CurrentStageEnum.PendingBrandFees;

    return CurrentStageEnum.PendingAgreement;
  }

  const hasCompletedVisit = proposalVisits.some(v => !!v.visitDate);
  const hasScheduledUncompletedVisit = proposalVisits.some(v => !!v.scheduledDate && !v.visitDate);

  if (hasCompletedVisit && hasScheduledUncompletedVisit) return CurrentStageEnum.PendingVisitAgain;
  if (hasCompletedVisit) return CurrentStageEnum.PendingTermsFinalization;
  if (hasScheduledUncompletedVisit && !hasCompletedVisit) return CurrentStageEnum.PendingVisit;
  if (!!proposal.proposalDate && proposalFollowUps.some(fu => fu.status === 'Schedule Visit') && !proposalVisits.some(v => !!v.scheduledDate)) {
    return CurrentStageEnum.PendingVisitScheduling;
  }
  if (!!proposal.proposalDate && !proposalVisits.some(v => !!v.scheduledDate)) return CurrentStageEnum.PendingFollowUp;
  return CurrentStageEnum.Draft;
};

export const getProperties = async (): Promise<Property[]> => (await listEntity(ENTITY_MAP.properties)).map(normalizeProperty);
export const addProperty = async (newProperty: Omit<Property, 'id' | 'serialNo'>, updatedBy = 'System'): Promise<Property> => {
  const propertyFeeStatus = derivePropertyFeeStatus(newProperty);
  const payload = {
    ...newProperty,
    propertyFeeStatus,
    propertyFeeEmailSent: !!newProperty.propertyFeeEmailSentDate,
    propertyFeeEmailSentDate: toSheetDate(newProperty.propertyFeeEmailSentDate),
    propertyFeeAcceptanceEmailDate: toSheetDate(newProperty.propertyFeeAcceptanceEmailDate),
    propertyFeePaperSigningDate: toSheetDate(newProperty.propertyFeePaperSigningDate),
    propertyFeeFollowUpDate: toSheetDate(newProperty.propertyFeeFollowUpDate),
    contactPersonsJson: newProperty.contactPersons || [],
    propertyPhotosJson: newProperty.propertyPhotos || [],
    drawingsJson: newProperty.drawings || [],
  };
  const res: any = await postJson({ action: 'create', entity: ENTITY_MAP.properties, data: payload, updatedBy });
  return normalizeProperty(res.data);
};
export const updateProperty = async (updatedProperty: Property, updatedBy = 'System'): Promise<Property> => {
  const propertyFeeStatus = derivePropertyFeeStatus(updatedProperty);
  const payload = {
    ...updatedProperty,
    propertyFeeStatus,
    propertyFeeEmailSent: !!updatedProperty.propertyFeeEmailSentDate,
    propertyFeeEmailSentDate: toSheetDate(updatedProperty.propertyFeeEmailSentDate),
    propertyFeeAcceptanceEmailDate: toSheetDate(updatedProperty.propertyFeeAcceptanceEmailDate),
    propertyFeePaperSigningDate: toSheetDate(updatedProperty.propertyFeePaperSigningDate),
    propertyFeeFollowUpDate: toSheetDate(updatedProperty.propertyFeeFollowUpDate),
    contactPersonsJson: updatedProperty.contactPersons || [],
    propertyPhotosJson: updatedProperty.propertyPhotos || [],
    drawingsJson: updatedProperty.drawings || [],
  };
  const res: any = await postJson({
    action: 'update',
    entity: ENTITY_MAP.properties,
    id: updatedProperty.id,
    data: payload,
    updatedBy,
    suppressNotification: true,
  });
  return normalizeProperty(res.data);
};
export const deleteProperty = async (id: string): Promise<boolean> => {
  const res: any = await postJson({ action: 'delete', entity: ENTITY_MAP.properties, id });
  return !!res.ok;
};

export const getBrands = async (): Promise<Brand[]> => (await listEntity(ENTITY_MAP.brands)).map(normalizeBrand);
export const addBrand = async (newBrand: Omit<Brand, 'id' | 'serialNo'>, updatedBy = 'System'): Promise<Brand> => {
  const payload = { ...newBrand, contactPersonsJson: newBrand.contactPersons || [] };
  const res: any = await postJson({ action: 'create', entity: ENTITY_MAP.brands, data: payload, updatedBy });
  return normalizeBrand(res.data);
};
export const updateBrand = async (updatedBrand: Brand, updatedBy = 'System'): Promise<Brand> => {
  const payload = { ...updatedBrand, contactPersonsJson: updatedBrand.contactPersons || [] };
  const res: any = await postJson({ action: 'update', entity: ENTITY_MAP.brands, id: updatedBrand.id, data: payload, updatedBy });
  return normalizeBrand(res.data);
};
export const deleteBrand = async (id: string): Promise<boolean> => {
  const res: any = await postJson({ action: 'delete', entity: ENTITY_MAP.brands, id });
  return !!res.ok;
};

const SIDVIN_TEAM_ENTITY_FALLBACKS: EntityName[] = ['SidvinTeam', 'SidvinTeamMembers', 'Sidvin Team Members'];

export const getSidvinTeamMembers = async (): Promise<SidvinTeamMember[]> => (
  await listEntityWithFallback(SIDVIN_TEAM_ENTITY_FALLBACKS)
).map(normalizeMember);
export const addSidvinTeamMember = async (newMember: Omit<SidvinTeamMember, 'id'>, updatedBy = 'System'): Promise<SidvinTeamMember> => {
  const res: any = await postJsonWithEntityFallback(
    { action: 'create', entity: ENTITY_MAP.sidvinTeam, data: newMember, updatedBy },
    SIDVIN_TEAM_ENTITY_FALLBACKS,
  );
  return normalizeMember(res.data);
};
export const updateSidvinTeamMember = async (updatedMember: SidvinTeamMember, updatedBy = 'System'): Promise<SidvinTeamMember> => {
  const res: any = await postJsonWithEntityFallback(
    { action: 'update', entity: ENTITY_MAP.sidvinTeam, id: updatedMember.id, data: updatedMember, updatedBy },
    SIDVIN_TEAM_ENTITY_FALLBACKS,
  );
  return normalizeMember(res.data);
};
export const deleteSidvinTeamMember = async (id: string): Promise<boolean> => {
  const res: any = await postJsonWithEntityFallback(
    { action: 'delete', entity: ENTITY_MAP.sidvinTeam, id },
    SIDVIN_TEAM_ENTITY_FALLBACKS,
  );
  return !!res.ok;
};

export const getProposals = async (): Promise<Proposal[]> => (await listEntity(ENTITY_MAP.proposals)).map(normalizeProposal);
export const getProposalById = async (id: string): Promise<Proposal | undefined> => {
  const res: any = await getJson(qs({ action: 'getById', entity: ENTITY_MAP.proposals, id }));
  return res.data ? normalizeProposal(res.data) : undefined;
};
export const addProposal = async (newProposal: Omit<Proposal, 'id' | 'serialNo' | 'currentStage'>, updatedBy = 'System'): Promise<Proposal> => {
  const nextSerialNo = await getNextSerialNoForEntity(ENTITY_MAP.proposals);
  const payload = {
    ...newProposal,
    serialNo: nextSerialNo,
    proposalDate: toSheetDate(newProposal.proposalDate),
    invoiceDate: toSheetDate(newProposal.invoiceDate),
    currentStage: CurrentStageEnum.Draft,
    invoiceStatus: !!newProposal.invoiceNo && !!newProposal.invoiceDate && newProposal.invoiceAmount !== null
  };
  const res: any = await postJson({ action: 'create', entity: ENTITY_MAP.proposals, data: payload, updatedBy });
  const normalized = normalizeProposal(res.data);
  if (!normalized.serialNo) normalized.serialNo = nextSerialNo;
  return normalized;
};
export const updateProposal = async (updatedProposal: Proposal, updatedBy = 'System'): Promise<Proposal> => {
  const payload = {
    ...updatedProposal,
    proposalDate: toSheetDate(updatedProposal.proposalDate),
    invoiceDate: toSheetDate(updatedProposal.invoiceDate),
    invoiceStatus: !!updatedProposal.invoiceNo && !!updatedProposal.invoiceDate && updatedProposal.invoiceAmount !== null
  };
  const res: any = await postJson({ action: 'update', entity: ENTITY_MAP.proposals, id: updatedProposal.id, data: payload, updatedBy });
  return normalizeProposal(res.data);
};
export const updateProposalInvoiceStatus = async (proposalId: string, invoiceStatus: boolean, updatedBy = 'System'): Promise<Proposal | undefined> => {
  const res: any = await postJson({ action: 'update', entity: ENTITY_MAP.proposals, id: proposalId, data: { invoiceStatus }, updatedBy });
  return res.data ? normalizeProposal(res.data) : undefined;
};
export const deleteProposal = async (id: string): Promise<boolean> => {
  const res: any = await postJson({ action: 'delete', entity: ENTITY_MAP.proposals, id });
  return !!res.ok;
};

export const getFollowUps = async (): Promise<FollowUp[]> => (await listEntity(ENTITY_MAP.followUps)).map(normalizeFollowUp);
export const getFollowUpsByProposalId = async (proposalId: string): Promise<FollowUp[]> => {
  const res: any = await getJson(qs({ action: 'getByProposalId', entity: ENTITY_MAP.followUps, proposalId }));
  return (Array.isArray(res.data) ? res.data : []).map(normalizeFollowUp);
};
export const addFollowUp = async (newFollowUp: Omit<FollowUp, 'id'>, updatedBy = 'System'): Promise<FollowUp> => {
  const payload = {
    ...newFollowUp,
    followUpDate: toSheetDate(newFollowUp.followUpDate),
    nextFollowUpDate: toSheetDate(newFollowUp.nextFollowUpDate),
    nextFollowUpTime: toSheetTime(newFollowUp.nextFollowUpTime),
    plannedVisitDate: toSheetDate(newFollowUp.plannedVisitDate),
  };
  const res: any = await postJson({ action: 'create', entity: ENTITY_MAP.followUps, data: payload, updatedBy });
  return normalizeFollowUp(res.data);
};
export const updateFollowUp = async (updatedFollowUp: FollowUp, updatedBy = 'System'): Promise<FollowUp> => {
  const payload = {
    ...updatedFollowUp,
    followUpDate: toSheetDate(updatedFollowUp.followUpDate),
    nextFollowUpDate: toSheetDate(updatedFollowUp.nextFollowUpDate),
    nextFollowUpTime: toSheetTime(updatedFollowUp.nextFollowUpTime),
    plannedVisitDate: toSheetDate(updatedFollowUp.plannedVisitDate),
  };
  const res: any = await postJson({ action: 'update', entity: ENTITY_MAP.followUps, id: updatedFollowUp.id, data: payload, updatedBy });
  return normalizeFollowUp(res.data);
};
export const deleteFollowUp = async (id: string): Promise<boolean> => {
  const res: any = await postJson({ action: 'delete', entity: ENTITY_MAP.followUps, id });
  return !!res.ok;
};

export const getVisits = async (): Promise<Visit[]> => (await listEntity(ENTITY_MAP.visits)).map(normalizeVisit);
export const getVisitsByProposalId = async (proposalId: string): Promise<Visit[]> => {
  const res: any = await getJson(qs({ action: 'getByProposalId', entity: ENTITY_MAP.visits, proposalId }));
  return (Array.isArray(res.data) ? res.data : []).map(normalizeVisit);
};
export const addVisit = async (newVisit: Omit<Visit, 'id'>, updatedBy = 'System'): Promise<Visit> => {
  const payload = {
    ...newVisit,
    scheduledDate: toSheetDate(newVisit.scheduledDate),
    scheduledTime: toSheetTime(newVisit.scheduledTime),
    visitDate: toSheetDate(newVisit.visitDate),
    meetingLink: toCleanString(newVisit.meetingLink) || null,
  };
  const res: any = await postJson({ action: 'create', entity: ENTITY_MAP.visits, data: payload, updatedBy });
  return normalizeVisit(res.data);
};
export const updateVisit = async (updatedVisit: Visit, updatedBy = 'System'): Promise<Visit> => {
  const payload = {
    ...updatedVisit,
    scheduledDate: toSheetDate(updatedVisit.scheduledDate),
    scheduledTime: toSheetTime(updatedVisit.scheduledTime),
    visitDate: toSheetDate(updatedVisit.visitDate),
    meetingLink: toCleanString(updatedVisit.meetingLink) || null,
  };
  const res: any = await postJson({ action: 'update', entity: ENTITY_MAP.visits, id: updatedVisit.id, data: payload, updatedBy });
  return normalizeVisit(res.data);
};
export const deleteVisit = async (id: string): Promise<boolean> => {
  const res: any = await postJson({ action: 'delete', entity: ENTITY_MAP.visits, id });
  return !!res.ok;
};

export const getTermSheetAgreements = async (): Promise<TermSheetAgreement[]> => (await listEntity(ENTITY_MAP.termSheets)).map(normalizeTermSheet);
export const getTermSheetByProposalId = async (proposalId: string): Promise<TermSheetAgreement | undefined> => {
  const res: any = await getJson(qs({ action: 'getByProposalId', entity: ENTITY_MAP.termSheets, proposalId }));
  const rows = Array.isArray(res.data) ? res.data : [];
  return rows.length ? normalizeTermSheet(rows[0]) : undefined;
};
export const addOrUpdateTermSheet = async (termSheet: TermSheetAgreement, updatedBy = 'System'): Promise<TermSheetAgreement> => {
  const payload = {
    ...termSheet,
    handoverDate: toSheetDate(termSheet.handoverDate),
    rentCommencementDate: toSheetDate(termSheet.rentCommencementDate),
    plannedOpeningDate: toSheetDate(termSheet.plannedOpeningDate),
    preparationDate: toSheetDate(termSheet.preparationDate),
    finalizationDate: toSheetDate(termSheet.finalizationDate),
    signingDate: toSheetDate(termSheet.signingDate),
    agreementDate: toSheetDate(termSheet.agreementDate),
    agreementRegistrationDate: toSheetDate(termSheet.agreementRegistrationDate),
    storeOpeningDate: toSheetDate(termSheet.storeOpeningDate),
    depositStagesJson: termSheet.depositStages || [],
  };
  const res: any = await postJson({ action: 'upsertByProposalId', entity: ENTITY_MAP.termSheets, proposalId: termSheet.proposalId, data: payload, updatedBy });
  return normalizeTermSheet(res.data);
};
export const updateAgreementDates = async (
  proposalId: string,
  agreementDate: string | null,
  agreementRegistrationDate: string | null,
  updatedBy = 'System'
): Promise<TermSheetAgreement | undefined> => {
  const existing = await getTermSheetByProposalId(proposalId);
  if (!existing) return undefined;
  const updated: TermSheetAgreement = { ...existing, agreementDate, agreementRegistrationDate };
  return addOrUpdateTermSheet(updated, updatedBy);
};
export const updateStoreOpeningDate = async (
  proposalId: string,
  storeOpeningDate: string | null,
  updatedBy = 'System'
): Promise<TermSheetAgreement | undefined> => {
  const existing = await getTermSheetByProposalId(proposalId);
  if (!existing) return undefined;
  const updated: TermSheetAgreement = { ...existing, storeOpeningDate };
  return addOrUpdateTermSheet(updated, updatedBy);
};
export const deleteTermSheet = async (_proposalId: string): Promise<boolean> => {
  throw new Error('TermSheet delete is not supported by current backend. Add a deleteByProposalId action in Apps Script.');
};

export const getCompanyMasterOptions = async (): Promise<MasterOptionItem[]> => (await listEntity(ENTITY_MAP.companyMaster as EntityName)).map(normalizeMasterOption);
export const addCompanyMasterOption = async (name: string, updatedBy = 'System'): Promise<MasterOptionItem> => {
  const payload = { name };
  const res: any = await postJson({ action: 'create', entity: ENTITY_MAP.companyMaster, data: payload, updatedBy });
  return normalizeMasterOption(res.data);
};
export const deleteCompanyMasterOption = async (id: string): Promise<boolean> => {
  const res: any = await postJson({ action: 'delete', entity: ENTITY_MAP.companyMaster, id });
  return !!res.ok;
};

export const getCategoryMasterOptions = async (): Promise<MasterOptionItem[]> => (await listEntity(ENTITY_MAP.categoryMaster as EntityName)).map(normalizeMasterOption);
export const addCategoryMasterOption = async (name: string, updatedBy = 'System'): Promise<MasterOptionItem> => {
  const payload = { name };
  const res: any = await postJson({ action: 'create', entity: ENTITY_MAP.categoryMaster, data: payload, updatedBy });
  return normalizeMasterOption(res.data);
};
export const deleteCategoryMasterOption = async (id: string): Promise<boolean> => {
  const res: any = await postJson({ action: 'delete', entity: ENTITY_MAP.categoryMaster, id });
  return !!res.ok;
};
export interface MasterOptionItem {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}
