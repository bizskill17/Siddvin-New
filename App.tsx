import React, { useState, useEffect, useCallback } from 'react';
import {
  Property,
  Brand,
  Proposal,
  Visit,
  TermSheetAgreement,
  CurrentStageEnum,
  SidvinTeamMember,
  FollowUp,
} from './types';
import * as dataService from './services/dataService';
import { MasterOptionItem } from './services/dataService';
import PropertiesTable from './components/tables/PropertiesTable';
import PendingDepositTable from './components/tables/PendingDepositTable';
import BrandsTable from './components/tables/BrandsTable';
import ProposalsTable from './components/tables/ProposalsTable';
import VisitsTable from './components/tables/VisitsTable';
import TermSheetAgreementsTable from './components/tables/TermSheetAgreementsTable';
import SidvinTeamTable from './components/tables/SidvinTeamTable';
import ProposalDetailView from './components/views/ProposalDetailView';
import PropertyDetailView from './components/views/PropertyDetailView';
import DashboardView from './components/views/DashboardView';
import CompanyCategoryView from './components/views/CompanyCategoryView';
import WhatsAppTemplatesView from './components/views/WhatsAppTemplatesView';
import ViewSettingsView from './components/views/ViewSettingsView';
import { StageActionIconName } from './components/common/StageActionIcon';
import WhatsAppConfirmModal, { WhatsAppSide } from './components/whatsapp/WhatsAppConfirmModal';
import Button from './components/common/Button';
import PropertyForm from './components/forms/PropertyForm';
import BrandForm from './components/forms/BrandForm';
import ProposalForm from './components/forms/ProposalForm';
import EditVisitForm from './components/forms/VisitForm';
import ScheduleVisitForm from './components/forms/ScheduleVisitForm';
import TermSheetAgreementForm from './components/forms/TermSheetAgreementForm';
import SidvinTeamForm from './components/forms/SidvinTeamForm';
import RecordAgreementAndStoreOpeningForm from './components/forms/RecordAgreementAndStoreOpeningForm';
import FollowUpForm from './components/forms/FollowUpForm';
import DeleteConfirmationModal from './components/common/DeleteConfirmationModal';
import SelectInput from './components/common/SelectInput';
import LoginForm from './components/auth/LoginForm';
import PageHeader from './components/common/PageHeader';
import PropertyPortalView from './components/propertyPortal/PropertyPortalView';

type View =
  | 'dashboard'
  | 'proposals'
  | 'properties'
  | 'propertyDetail'
  | 'brands'
  | 'visits'
  | 'termSheets'
  | 'sidvinTeam'
  | 'propertyFeeFollowUp'
  | 'pendingDeposit'
  | 'companyMaster'
  | 'categoryMaster'
  | 'whatsappTemplates'
  | 'viewSettings'
  | 'proposalDetail'
  | 'addProperty'
  | 'editProperty'
  | 'addBrand'
  | 'editBrand'
  | 'addProposal'
  | 'editProposal'
  | 'scheduleVisit'
  | 'editVisit'
  | 'addTermSheetDetails'
  | 'editTermSheetDetails'
  | 'recordAgreementAndStoreOpening'
  | 'addTeamMember'
  | 'editTeamMember'
  | 'addFollowUp'
  | 'editFollowUp';

type PropertyTaskStatus =
  | 'Pending Property Files'
  | 'Pending Property Email'
  | 'Pending Negotiation'
  | 'Pending Acceptance Email'
  | 'Pending MOU Signing'
  | 'Accepted & Signed';

type PortalMode = 'team' | 'property';

const DEFAULT_VIEW_SETTINGS: dataService.ViewSettings = {
  logoDataUrl: '',
  orgName: 'Sidvin',
  theme: 'terracotta',
  updatedAt: null,
  updatedBy: null,
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewSettings, setViewSettings] = useState<dataService.ViewSettings>(DEFAULT_VIEW_SETTINGS);
  const [properties, setProperties] = useState<Property[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [termSheetAgreements, setTermSheetAgreements] = useState<TermSheetAgreement[]>([]);
  const [sidvinTeamMembers, setSidvinTeamMembers] = useState<SidvinTeamMember[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [companyMasterOptions, setCompanyMasterOptions] = useState<MasterOptionItem[]>([]);
  const [categoryMasterOptions, setCategoryMasterOptions] = useState<MasterOptionItem[]>([]);

  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editingTermSheet, setEditingTermSheet] = useState<TermSheetAgreement | null>(null);
  const [editingTeamMember, setEditingTeamMember] = useState<SidvinTeamMember | null>(null);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  const [selectedStageFilter, setSelectedStageFilter] = useState<CurrentStageEnum | 'All'>('All');
  const [selectedPropertyTaskFilter, setSelectedPropertyTaskFilter] = useState<PropertyTaskStatus | 'All'>('All');

  const [propertyReturnView, setPropertyReturnView] = useState<'properties' | 'propertyFeeFollowUp'>('properties');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: string; name?: string } | null>(null);
  const [deleteCallback, setDeleteCallback] = useState<(() => void) | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // The signed-in session comes from the server (see dataService.getSession); nothing here is trusted from localStorage.
  const [session, setSession] = useState<dataService.SessionInfo | null>(null);
  const [portalMode, setPortalMode] = useState<PortalMode>(localStorage.getItem('sidvinPortalMode') === 'property' ? 'property' : 'team');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('Submitting...');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        return localStorage.getItem('sidvinSidebarHidden') !== 'true';
      }
    } catch {
      // Use the closed drawer default when browser storage is unavailable.
    }
    return false;
  });
  const [expandedSections, setExpandedSections] = useState({
    deposit: false,
    masterData: false,
  });

  const clearData = () => {
    setProperties([]);
    setBrands([]);
    setVisits([]);
    setTermSheetAgreements([]);
    setSidvinTeamMembers([]);
    setFollowUps([]);
    setProposals([]);
    setCompanyMasterOptions([]);
    setCategoryMasterOptions([]);
    setViewSettings(DEFAULT_VIEW_SETTINGS);
  };

  const fetchData = useCallback(async (kind: dataService.SessionInfo['kind']) => {
    // Property sessions can only read data about their own property; the server enforces this.
    const isTeam = kind === 'team';
    const [props, brs, vsts, terms, team, fus, prs, companies, categories, viewSettingsResponse] = await Promise.all([
      dataService.getProperties(),
      dataService.getBrands(),
      dataService.getVisits(),
      dataService.getTermSheetAgreements(),
      isTeam ? dataService.getSidvinTeamMembers() : Promise.resolve([]),
      dataService.getFollowUps(),
      dataService.getProposals(),
      isTeam ? dataService.getCompanyMasterOptions() : Promise.resolve([]),
      isTeam ? dataService.getCategoryMasterOptions() : Promise.resolve([]),
      isTeam ? dataService.getViewSettings() : Promise.resolve({ settings: DEFAULT_VIEW_SETTINGS, canEditSettings: false }),
    ]);

    const calculated = prs.map((p) => ({
      ...p,
      currentStage: dataService.calculateCurrentStage(p, vsts, terms, fus),
    }));

    setProperties(props);
    setBrands(brs);
    setVisits(vsts);
    setTermSheetAgreements(terms);
    setSidvinTeamMembers(team);
    setFollowUps(fus);
    setProposals(calculated);
    setCompanyMasterOptions(companies);
    setCategoryMasterOptions(categories);
    setViewSettings(viewSettingsResponse.settings);
  }, []);

  const signedOut = useCallback(() => {
    setSession(null);
    clearData();
  }, []);

  const beginSession = useCallback(async (next: dataService.SessionInfo) => {
    setSession(next);
    const mode: PortalMode = next.kind === 'property' ? 'property' : 'team';
    setPortalMode(mode);
    localStorage.setItem('sidvinPortalMode', mode);
    setIsInitialLoading(true);
    try {
      await fetchData(next.kind);
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [fetchData]);

  // Restore an existing session (if the stored token is still valid) on page load.
  useEffect(() => {
    dataService.setUnauthorizedHandler(signedOut);
    let cancelled = false;
    dataService.getSession()
      .then((existing) => {
        if (cancelled) return;
        if (existing) return beginSession(existing);
        setIsInitialLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setIsInitialLoading(false);
      });
    return () => {
      cancelled = true;
      dataService.setUnauthorizedHandler(null);
    };
  }, [beginSession, signedOut]);

  const teamUser = session?.kind === 'team' ? session.user : null;
  const isAuthenticated = !!teamUser;
  const propertyPortalSessionId = session?.kind === 'property' ? session.property.id : '';
  const currentUserName = teamUser?.name || 'System';
  const currentUserRole = teamUser?.role || 'Employee';

  const refreshData = async () => {
    if (session) await fetchData(session.kind);
  };

  const toggleSidebar = () => {
    const nextOpen = !isSidebarOpen;
    setIsSidebarOpen(nextOpen);
    try {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        localStorage.setItem('sidvinSidebarHidden', nextOpen ? 'false' : 'true');
      }
    } catch {
      // The menu still toggles for this session if browser storage is unavailable.
    }
  };

  const logout = async () => {
    await dataService.logout();
    signedOut();
  };

  const switchToTeamPortal = () => {
    if (session?.kind === 'property') void logout();
    setPortalMode('team');
    localStorage.setItem('sidvinPortalMode', 'team');
  };

  const switchToPropertyPortal = () => {
    if (session?.kind === 'team') void logout();
    setPortalMode('property');
    localStorage.setItem('sidvinPortalMode', 'property');
  };

  const endPropertySession = () => {
    void logout();
  };

  const runWithSaving = async (message: string, work: () => Promise<void>) => {
    setSavingMessage(message);
    setIsSaving(true);
    try {
      await work();
    } catch (error: any) {
      window.alert(error?.message || 'Failed to submit data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewChange = (view: View) => {
    setReturnToList(false);
    setCurrentView(view);
    setSelectedPropertyId(null);
    // Keep the desktop sidebar preference when navigating; close only the mobile drawer.
    if (!window.matchMedia('(min-width: 1024px)').matches) setIsSidebarOpen(false);
    setSelectedProposalId(null);
    setEditingProperty(null);
    setEditingBrand(null);
    setEditingProposal(null);
    setEditingVisit(null);
    setEditingTermSheet(null);
    setEditingTeamMember(null);
    setEditingFollowUp(null);
  };

  const getPropertyTaskStatus = (property: Property): PropertyTaskStatus => {
    const hasPhoto1 = !!(property.propertyPhotos?.[0] || '').trim();

    // Keep property in Pending Property Files until only Photograph 1 URL is present.
    if (!hasPhoto1) {
      return 'Pending Property Files';
    }
    // Backward compatibility for 'Pending Property Signing'
    const status = property.propertyFeeStatus as string;
    if (status === 'Pending Property Signing') return 'Pending MOU Signing';
    return property.propertyFeeStatus as any;
  };

  // Field to jump to when Edit Property is opened from the list's update icon.
  const [propertyFocusField, setPropertyFocusField] = useState<string | undefined>(undefined);
  const [propertyFormSection, setPropertyFormSection] = useState<'files' | 'coordination' | undefined>(undefined);

  /** The next step for a property at its current status (green update icon in the Properties list). */
  const getPropertyUpdateAction = (property: Property): { label: string; icon: StageActionIconName; field: string; section: 'files' | 'coordination' } | null => {
    switch (getPropertyTaskStatus(property)) {
      case 'Pending Property Files':
        return { label: 'Add property photos / files', icon: 'photos', field: 'propertyPhoto-0', section: 'files' };
      case 'Pending Property Email':
        return { label: 'Enter service fee email sent date', icon: 'mail', field: 'propertyFeeEmailSentDate', section: 'coordination' };
      case 'Pending Negotiation':
        return { label: 'Update negotiation / acceptance email date', icon: 'negotiate', field: 'propertyFeeAcceptanceEmailDate', section: 'coordination' };
      case 'Pending Acceptance Email':
        return { label: 'Enter acceptance email date', icon: 'mailCheck', field: 'propertyFeeAcceptanceEmailDate', section: 'coordination' };
      case 'Pending MOU Signing':
        return { label: 'Enter MOU signing date', icon: 'agreement', field: 'propertyFeePaperSigningDate', section: 'coordination' };
      default:
        return null;
    }
  };

  const getPropertyTaskLabel = (status: PropertyTaskStatus) => {
    if (status === 'Pending Property Email') return 'Pending Service Fee Email';
    if (status === 'Pending MOU Signing') return 'Pending MOU Signing';
    return status;
  };

  const handleViewProposalDetails = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setCurrentView('proposalDetail');
  };

  const handleViewPropertyDetails = (property: Property) => {
    setSelectedPropertyId(property.id);
    setCurrentView('propertyDetail');
  };

  const companyOptions = Array.from(new Set([...brands.map(b => (b.companyName || '').trim()).filter(Boolean), ...companyMasterOptions.map(c => c.name)])).sort((a, b) => a.localeCompare(b));
  const categoryOptions = Array.from(new Set([...brands.map(b => (b.category || '').trim()).filter(Boolean), ...categoryMasterOptions.map(c => c.name)])).sort((a, b) => a.localeCompare(b));

  const addCompanyOption = async (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (companyOptions.some(v => v.toLowerCase() === normalized.toLowerCase())) {
      window.alert('Company already exists.');
      return;
    }
    await runWithSaving('Adding Company...', async () => {
      await dataService.addCompanyMasterOption(normalized, currentUserName);
      await refreshData();
    });
  };
  const addCategoryOption = async (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (categoryOptions.some(v => v.toLowerCase() === normalized.toLowerCase())) {
      window.alert('Category already exists.');
      return;
    }
    await runWithSaving('Adding Category...', async () => {
      await dataService.addCategoryMasterOption(normalized, currentUserName);
      await refreshData();
    });
  };
  const removeCompanyOption = async (value: string) => {
    const row = companyMasterOptions.find(v => v.name.toLowerCase() === value.toLowerCase());
    if (!row?.id) return;
    await runWithSaving('Removing Company...', async () => {
      await dataService.deleteCompanyMasterOption(row.id);
      await refreshData();
    });
  };
  const removeCategoryOption = async (value: string) => {
    const row = categoryMasterOptions.find(v => v.name.toLowerCase() === value.toLowerCase());
    if (!row?.id) return;
    await runWithSaving('Removing Category...', async () => {
      await dataService.deleteCategoryMasterOption(row.id);
      await refreshData();
    });
  };

  const handleAddPropertyView = () => {
    setPropertyReturnView('properties');
    handleViewChange('addProperty');
  };

  const handleEditPropertyView = (
    property: Property,
    returnView: 'properties' | 'propertyFeeFollowUp',
    focus?: { field: string; section: 'files' | 'coordination' },
  ) => {
    setPropertyFocusField(focus?.field);
    setPropertyFormSection(focus?.section);
    setPropertyReturnView('properties'); // Always return to unified view
    setEditingProperty(property);
    setCurrentView('editProperty');
  };

  const toggleSection = (section: 'deposit' | 'masterData') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getStageReceiptEntries = (stage: TermSheetAgreement['depositStages'][number]) => {
    if (stage.receipts && stage.receipts.length > 0) {
      return stage.receipts;
    }

    const fallbackAmount = stage.receivedAmount ?? (stage.received ? (stage.amount ?? 0) : 0);
    if (fallbackAmount > 0) {
      return [{
        id: `legacy-${stage.id}`,
        receiptDate: stage.receiptDate ?? null,
        receiptAmount: fallbackAmount,
      }];
    }

    return [];
  };

  const handleUpdateDepositReceived = async (
    termSheet: TermSheetAgreement,
    depositStageId: string,
    receiptDate: string,
    receiptAmount: number
  ) => {
    const updatedStages = (termSheet.depositStages || []).map((ds) => {
      if (ds.id !== depositStageId) {
        return ds;
      }

      const updatedReceipts = [
        ...getStageReceiptEntries(ds),
        {
          id: Math.random().toString(36).substring(2, 9),
          receiptDate,
          receiptAmount,
        },
      ];
      const stageAmount = ds.amount ?? 0;
      const nextReceived = updatedReceipts.reduce((sum, receipt) => sum + (receipt.receiptAmount || 0), 0);

      return {
        ...ds,
        receipts: updatedReceipts,
        receiptDate,
        receivedAmount: nextReceived,
        received: stageAmount > 0 ? nextReceived >= stageAmount : true,
      };
    });
    const updatedTermSheet: TermSheetAgreement = { ...termSheet, depositStages: updatedStages };
    await runWithSaving('Updating Receipt...', async () => {
      await dataService.addOrUpdateTermSheet(updatedTermSheet, currentUserName);
      await refreshData();
    });
  };

  const handleDeleteDepositReceipt = async (
    termSheet: TermSheetAgreement,
    depositStageId: string,
    receiptId: string
  ) => {
    const updatedStages = (termSheet.depositStages || []).map((ds) => {
      if (ds.id !== depositStageId) {
        return ds;
      }

      const remainingReceipts = getStageReceiptEntries(ds).filter((receipt) => receipt.id !== receiptId);
      const totalReceived = remainingReceipts.reduce((sum, receipt) => sum + (receipt.receiptAmount || 0), 0);
      const latestReceipt = remainingReceipts[remainingReceipts.length - 1];
      const stageAmount = ds.amount ?? 0;

      return {
        ...ds,
        receipts: remainingReceipts,
        receiptDate: latestReceipt?.receiptDate ?? null,
        receivedAmount: totalReceived > 0 ? totalReceived : null,
        received: stageAmount > 0 ? totalReceived >= stageAmount : false,
      };
    });

    const updatedTermSheet: TermSheetAgreement = { ...termSheet, depositStages: updatedStages };
    await runWithSaving('Deleting Receipt...', async () => {
      await dataService.addOrUpdateTermSheet(updatedTermSheet, currentUserName);
      await refreshData();
    });
  };

  // ---------------------------------------------------------------------------
  // Saving with an optional WhatsApp message: the form first opens a confirmation that previews the
  // messages; the record is saved only after confirming, then the ticked messages are sent.
  // ---------------------------------------------------------------------------
  interface PendingWhatsAppSave {
    title: string;
    subtitle?: string;
    event: dataService.WhatsAppEvent;
    record: unknown;
    defaultSend: boolean;
    savingLabel: string;
    /** Runs right after confirming, before saving (e.g. leave the form). */
    beforeSave?: () => void;
    /** Saves the record and returns the id the messages belong to. */
    save: () => Promise<string>;
    /** Runs after saving and sending. */
    afterSave?: () => void;
  }
  const [pendingWhatsAppSave, setPendingWhatsAppSave] = useState<PendingWhatsAppSave | null>(null);

  // Forms opened from a proposals list (the green update icon) go back to that list when done.
  const [returnToList, setReturnToList] = useState(false);
  /** Where to go after a proposal-related form: the list it was opened from, or the proposal detail. */
  const makeLeave = () => {
    const toList = returnToList;
    return () => (toList ? handleViewChange('proposals') : setCurrentView('proposalDetail'));
  };

  const confirmWhatsAppSave = async (sides: WhatsAppSide[]) => {
    const job = pendingWhatsAppSave;
    if (!job) return;
    setPendingWhatsAppSave(null);
    job.beforeSave?.();
    // A fresh key per save, so a retry or double click can never send the same message twice.
    const requestKey = `wa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    let report = '';
    await runWithSaving(job.savingLabel, async () => {
      const entityId = await job.save();
      if (!sides.length) return;
      setSavingMessage('Sending WhatsApp messages...');
      try {
        const result = await dataService.sendWhatsApp(job.event, entityId, sides, requestKey);
        const lines: string[] = [];
        result.forEach((side) => {
          lines.push(`${side.label}:`);
          if (side.error) lines.push(`  Not sent: ${side.error}`);
          side.results.forEach((r) => {
            const label = r.status === 'accepted' ? 'sent' : r.status === 'unknown' ? 'not confirmed' : r.status;
            lines.push(`  • ${r.name || 'contact'} (+${r.to}): ${label}${r.note && r.status !== 'accepted' ? ` - ${r.note}` : ''}`);
          });
          side.skipped.forEach((k) => lines.push(`  • Skipped: ${k}`));
        });
        report = `Saved.\n\nWhatsApp:\n${lines.join('\n')}`;
      } catch (err: any) {
        report = `Saved, but the WhatsApp messages were not sent:\n${err?.message || 'Unknown error.'}`;
      }
    });
    job.afterSave?.();
    if (report) window.alert(report);
  };

  const handleAddProperty = async (newProperty: Omit<Property, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    setPendingWhatsAppSave({
      title: 'Add this property?',
      subtitle: newProperty.address,
      event: 'property_registration',
      record: newProperty,
      defaultSend: true,
      savingLabel: 'Adding Property...',
      beforeSave: () => handleViewChange('properties'),
      save: async () => {
        const saved = await dataService.addProperty(newProperty, currentUserName);
        await refreshData();
        return saved.id;
      },
    });
  };

  const handleUpdateProperty = async (updatedProperty: Property) => {
    const returnView = propertyReturnView;
    handleViewChange(returnView);
    await runWithSaving('Updating Property...', async () => {
      await dataService.updateProperty(updatedProperty, currentUserName);
      await refreshData();
    });
  };

  const handleAddBrand = async (newBrand: Omit<Brand, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    const duplicate = brands.find(
      b => b.name.trim().toLowerCase() === newBrand.name.trim().toLowerCase()
    );
    if (duplicate) {
      window.alert('Brand with same name already exists.');
      return;
    }
    setPendingWhatsAppSave({
      title: 'Add this brand?',
      subtitle: [newBrand.name, newBrand.companyName].filter(Boolean).join(' - '),
      event: 'brand_registration',
      record: newBrand,
      defaultSend: true,
      savingLabel: 'Adding Brand...',
      beforeSave: () => handleViewChange('brands'),
      save: async () => {
        const saved = await dataService.addBrand(newBrand, currentUserName);
        await refreshData();
        return saved.id;
      },
    });
  };

  const handleUpdateBrand = async (updatedBrand: Brand) => {
    const duplicate = brands.find(
      b => b.id !== updatedBrand.id && b.name.trim().toLowerCase() === updatedBrand.name.trim().toLowerCase()
    );
    if (duplicate) {
      window.alert('Brand with same name already exists.');
      return;
    }
    handleViewChange('brands');
    await runWithSaving('Updating Brand...', async () => {
      await dataService.updateBrand(updatedBrand, currentUserName);
      await refreshData();
    });
  };

  const handleAddProposal = async (newProposal: Omit<Proposal, 'id' | 'serialNo' | 'currentStage' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    const save = async () => {
      const saved = await dataService.addProposal(newProposal, currentUserName);
      await refreshData();
      return saved.id;
    };
    if (!newProposal.proposalDate) {
      handleViewChange('proposals');
      await runWithSaving('Adding Proposal...', async () => { await save(); });
      return;
    }
    setPendingWhatsAppSave({
      title: 'Add this proposal?',
      subtitle: describeProposal(newProposal.propertyId, newProposal.brandId),
      event: 'proposal_sent',
      record: newProposal,
      defaultSend: true,
      savingLabel: 'Adding Proposal...',
      beforeSave: () => handleViewChange('proposals'),
      save,
    });
  };

  const isBilled = (p: Pick<Proposal, 'invoiceNo' | 'invoiceDate' | 'invoiceAmount'> | undefined) =>
    !!p && !!p.invoiceNo && !!p.invoiceDate && p.invoiceAmount !== null && p.invoiceAmount !== undefined;

  const describeProposal = (propertyId: string, brandId: string) => {
    const property = properties.find((p) => p.id === propertyId);
    const brand = brands.find((b) => b.id === brandId);
    return [brand?.name, property?.address].filter(Boolean).join(' - ');
  };

  const handleUpdateProposal = async (updatedProposal: Proposal) => {
    const save = async () => {
      await dataService.updateProposal(updatedProposal, currentUserName);
      await refreshData();
      return updatedProposal.id;
    };
    const before = proposals.find((p) => p.id === updatedProposal.id);
    // Deal closed: the invoice details were just completed.
    if (!isBilled(updatedProposal) || isBilled(before)) {
      handleViewChange('proposals');
      await runWithSaving('Updating Proposal...', async () => { await save(); });
      return;
    }
    setPendingWhatsAppSave({
      title: 'Save this proposal as billed?',
      subtitle: describeProposal(updatedProposal.propertyId, updatedProposal.brandId),
      event: 'deal_closed',
      record: updatedProposal,
      defaultSend: true,
      savingLabel: 'Updating Proposal...',
      beforeSave: () => handleViewChange('proposals'),
      save,
    });
  };

  const handleScheduleVisit = async (newVisitData: Omit<Visit, 'id' | 'visitDate' | 'visitOutcome' | 'developerAttendees' | 'brandAttendees' | 'sidvinAttendees' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    const newVisit: Omit<Visit, 'id'> = {
      ...newVisitData,
      meetingType: newVisitData.meetingType || 'Physical',
      meetingAgenda: newVisitData.meetingAgenda || '',
      visitDate: null,
      visitOutcome: '',
      developerAttendees: '',
      brandAttendees: '',
      sidvinAttendees: '',
    };
    const proposal = proposals.find((p) => p.id === newVisit.proposalId);
    setPendingWhatsAppSave({
      title: newVisit.meetingType === 'Virtual' ? 'Schedule this virtual meeting?' : 'Schedule this visit?',
      subtitle: proposal ? describeProposal(proposal.propertyId, proposal.brandId) : undefined,
      event: 'visit_scheduled',
      record: newVisit,
      defaultSend: true,
      savingLabel: 'Scheduling Visit...',
      beforeSave: makeLeave(),
      save: async () => {
        const saved = await dataService.addVisit(newVisit, currentUserName);
        await refreshData();
        return saved.id;
      },
    });
  };

  const handleUpdateVisit = async (updatedVisit: Omit<Visit, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    if (!editingVisit) return;
    const merged = { ...editingVisit, ...updatedVisit };
    const save = async () => {
      await dataService.updateVisit(merged, currentUserName);
      await refreshData();
      return merged.id;
    };
    const leave = makeLeave();
    // Visit completed: the actual visit date was just filled in.
    if (!merged.visitDate || editingVisit.visitDate) {
      leave();
      await runWithSaving('Updating Visit...', async () => { await save(); });
      return;
    }
    const proposal = proposals.find((p) => p.id === merged.proposalId);
    setPendingWhatsAppSave({
      title: 'Mark this visit as completed?',
      subtitle: proposal ? describeProposal(proposal.propertyId, proposal.brandId) : undefined,
      event: 'visit_completed',
      record: merged,
      defaultSend: true,
      savingLabel: 'Updating Visit...',
      beforeSave: leave,
      save,
    });
  };

  const handleAddFollowUp = async (newFollowUp: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>, actionToTake?: 'scheduleVisit') => {
    const toList = returnToList;
    const leave = makeLeave();
    const goNext = () => {
      if (actionToTake === 'scheduleVisit') {
        setSelectedProposalId(newFollowUp.proposalId);
        setCurrentView('scheduleVisit');
        setReturnToList(toList);
      } else {
        leave();
      }
    };
    let savedId = '';
    const save = async () => {
      const saved = await dataService.addFollowUp(newFollowUp, currentUserName);
      await refreshData();
      savedId = saved.id;
      return saved.id;
    };
    // A next follow-up with a date and time can be announced as a meeting (off by default:
    // not every follow-up is a meeting with the owner).
    const isMeeting = newFollowUp.status === 'Follow Up Again' && !!newFollowUp.nextFollowUpDate && !!newFollowUp.nextFollowUpTime;
    if (!isMeeting) {
      if (actionToTake !== 'scheduleVisit') leave();
      await runWithSaving('Adding Follow Up...', async () => { await save(); goNext(); });
      return;
    }
    const proposal = proposals.find((p) => p.id === newFollowUp.proposalId);
    setPendingWhatsAppSave({
      title: 'Add this follow-up?',
      subtitle: proposal ? describeProposal(proposal.propertyId, proposal.brandId) : undefined,
      event: 'follow_up_meeting',
      record: newFollowUp,
      defaultSend: false,
      savingLabel: 'Adding Follow Up...',
      beforeSave: () => { if (actionToTake !== 'scheduleVisit') leave(); },
      save,
      afterSave: () => { if (savedId && actionToTake === 'scheduleVisit') goNext(); },
    });
  };

  const handleUpdateFollowUp = async (updatedFollowUp: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>, actionToTake?: 'scheduleVisit') => {
    if (!editingFollowUp) return;
    setCurrentView(actionToTake === 'scheduleVisit' ? 'scheduleVisit' : 'proposalDetail');
    await runWithSaving('Updating Follow Up...', async () => {
      await dataService.updateFollowUp({ ...editingFollowUp, ...updatedFollowUp }, currentUserName);
      await refreshData();
      if (actionToTake === 'scheduleVisit') {
        setSelectedProposalId(updatedFollowUp.proposalId);
        setCurrentView('scheduleVisit');
      } else {
        setCurrentView('proposalDetail');
      }
    });
  };

  const handleAddOrUpdateTermSheetDetails = async (termSheetData: Omit<TermSheetAgreement, 'agreementDate' | 'storeOpeningDate' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    const leave = makeLeave();
    const before = termSheetAgreements.find((t) => t.proposalId === termSheetData.proposalId);
    const meetingSet = !!termSheetData.termsMeetingDate && !!termSheetData.termsMeetingTime;
    const meetingChanged = meetingSet && (
      (before?.termsMeetingDate || '') !== termSheetData.termsMeetingDate || (before?.termsMeetingTime || '') !== termSheetData.termsMeetingTime
    );
    if (meetingChanged) {
      const proposal = proposals.find((p) => p.id === termSheetData.proposalId);
      setPendingWhatsAppSave({
        title: 'Save terms and the meeting?',
        subtitle: proposal ? describeProposal(proposal.propertyId, proposal.brandId) : undefined,
        event: 'terms_meeting',
        record: termSheetData,
        defaultSend: true,
        savingLabel: 'Saving Terms...',
        beforeSave: leave,
        save: async () => { await saveTermSheetDetails(termSheetData); return termSheetData.proposalId; },
      });
      return;
    }
    leave();
    await runWithSaving('Saving Terms...', async () => { await saveTermSheetDetails(termSheetData); });
  };

  const saveTermSheetDetails = async (termSheetData: Omit<TermSheetAgreement, 'agreementDate' | 'storeOpeningDate' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    const existingTermSheet = await dataService.getTermSheetByProposalId(termSheetData.proposalId);
    const fullTermSheet: TermSheetAgreement = {
      ...termSheetData,
      leaseAgreementRemarks: existingTermSheet?.leaseAgreementRemarks || termSheetData.leaseAgreementRemarks || '',
      agreementDate: existingTermSheet?.agreementDate || null,
      storeOpeningDate: existingTermSheet?.storeOpeningDate || null,
      createdAt: existingTermSheet?.createdAt,
      updatedAt: existingTermSheet?.updatedAt,
      updatedBy: existingTermSheet?.updatedBy,
    };
    await dataService.addOrUpdateTermSheet(fullTermSheet, currentUserName);
    await refreshData();
  };

  const handleRecordAgreementAndStoreOpeningDates = async (
    proposalId: string,
    data: {
      leaseAgreementPrepared: string | null;
      leaseAgreementRemarks: string;
      leaseAgreementSigned: string | null;
      leaseAgreementRegistered: string | null;
      storeOpeningDate: string | null;
    }
  ) => {
    makeLeave()();
    await runWithSaving('Updating Agreement...', async () => {
      const existingTermSheet = await dataService.getTermSheetByProposalId(proposalId);
      if (!existingTermSheet) {
        throw new Error('Terms not found for this proposal.');
      }
      await dataService.addOrUpdateTermSheet({
        ...existingTermSheet,
        preparationDate: data.leaseAgreementPrepared,
        leaseAgreementRemarks: data.leaseAgreementRemarks,
        signingDate: data.leaseAgreementSigned,
        agreementRegistrationDate: data.leaseAgreementRegistered,
        storeOpeningDate: data.storeOpeningDate,
      }, currentUserName);
      await refreshData();
    });
  };

  const handleAddTeamMember = async (newMember: Omit<SidvinTeamMember, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    const nextEmail = String(newMember.email ?? '').trim().toLowerCase();
    const nextMobile = String(newMember.mobile ?? '').trim();
    const duplicate = sidvinTeamMembers.find(
      m => String(m.email ?? '').trim().toLowerCase() === nextEmail || String(m.mobile ?? '').trim() === nextMobile
    );
    if (duplicate) {
      window.alert('Team member with same email or mobile already exists.');
      return;
    }
    handleViewChange('sidvinTeam');
    await runWithSaving('Adding Team Member...', async () => {
      await dataService.addSidvinTeamMember(newMember, currentUserName);
      await refreshData();
    });
  };

  const handleUpdateTeamMember = async (updatedMember: SidvinTeamMember) => {
    const updatedEmail = String(updatedMember.email ?? '').trim().toLowerCase();
    const updatedMobile = String(updatedMember.mobile ?? '').trim();
    const duplicate = sidvinTeamMembers.find(
      m => m.id !== updatedMember.id && (
        String(m.email ?? '').trim().toLowerCase() === updatedEmail ||
        String(m.mobile ?? '').trim() === updatedMobile
      )
    );
    if (duplicate) {
      window.alert('Team member with same email or mobile already exists.');
      return;
    }
    handleViewChange('sidvinTeam');
    await runWithSaving('Updating Team Member...', async () => {
      await dataService.updateSidvinTeamMember(updatedMember, currentUserName);
      await refreshData();
    });
  };

  const handleCancelForm = () => {
    setEditingProperty(null);
    setEditingBrand(null);
    setEditingProposal(null);
    setEditingVisit(null);
    setEditingTermSheet(null);
    setEditingTeamMember(null);
    setEditingFollowUp(null);

    if (returnToList) {
      handleViewChange('proposals');
    } else if (selectedProposalId) {
      setCurrentView('proposalDetail');
    } else {
      if (currentView.includes('Property')) setCurrentView(propertyReturnView);
      else if (currentView.includes('Brand')) setCurrentView('brands');
      else if (currentView.includes('Proposal')) setCurrentView('proposals');
      else if (currentView.includes('TeamMember')) setCurrentView('sidvinTeam');
      else if (currentView.includes('Visit')) setCurrentView('visits');
      else if (currentView.includes('TermSheet')) setCurrentView('termSheets');
      else if (currentView.includes('FollowUp')) setCurrentView('proposals');
    }
  };

  const handleDeleteClick = (id: string, type: string, name?: string) => {
    setItemToDelete({ id, type, name });
    setDeleteError(null);
    setShowDeleteConfirm(true);
    setDeleteCallback(() => async () => {
      try {
        const label = (name || type || 'item').toString();
        setSavingMessage(`Deleting ${label}...`);
        setIsSaving(true);
        let success = false;
        switch (type) {
          case 'property': success = await dataService.deleteProperty(id); break;
          case 'brand': success = await dataService.deleteBrand(id); break;
          case 'proposal': success = await dataService.deleteProposal(id); break;
          case 'visit': success = await dataService.deleteVisit(id); break;
          case 'followUp': success = await dataService.deleteFollowUp(id); break;
          case 'termSheet': success = await dataService.deleteTermSheet(id); break;
          case 'teamMember': success = await dataService.deleteSidvinTeamMember(id); break;
          default: throw new Error('Unknown item type for deletion.');
        }
        if (success) {
          await refreshData();
          setShowDeleteConfirm(false);
          if (type === 'proposal' && selectedProposalId === id) handleViewChange('proposals');
        } else {
          setDeleteError(`Failed to delete ${type}.`);
        }
      } catch (error: any) {
        setDeleteError(error.message || `An error occurred while deleting ${type}.`);
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleConfirmDelete = () => { if (deleteCallback) deleteCallback(); };
  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    setDeleteCallback(null);
    setDeleteError(null);
  };

  const renderPageHeader = (
    title: string,
    options?: { onBack?: () => void; backLabel?: string; actions?: React.ReactNode }
  ) => (
    <PageHeader
      title={title}
      onBack={options?.onBack}
      backLabel={options?.backLabel}
      actions={options?.actions}
    />
  );

  /** The next step for a proposal at its current stage (green update icon in the lists). */
  const getProposalUpdateAction = (proposal: Proposal): { label: string; icon: StageActionIconName; open: () => void } | null => {
    const pendingVisit = visits
      .filter((v) => v.proposalId === proposal.id && v.scheduledDate && !v.visitDate)
      .sort((a, b) => String(b.scheduledDate).localeCompare(String(a.scheduledDate)))[0];
    const termSheet = termSheetAgreements.find((t) => t.proposalId === proposal.id);
    const open = (view: View, setup: () => void) => () => {
      setup();
      setCurrentView(view);
      setReturnToList(true);
    };
    switch (proposal.currentStage) {
      case CurrentStageEnum.Draft:
        return { label: 'Edit proposal (add proposal date)', icon: 'proposal', open: open('editProposal', () => setEditingProposal(proposal)) };
      case CurrentStageEnum.PendingFollowUp:
        return { label: 'Add follow-up', icon: 'followUp', open: open('addFollowUp', () => setSelectedProposalId(proposal.id)) };
      case CurrentStageEnum.PendingVisitScheduling:
        return { label: 'Schedule visit', icon: 'schedule', open: open('scheduleVisit', () => setSelectedProposalId(proposal.id)) };
      case CurrentStageEnum.PendingVisit:
      case CurrentStageEnum.PendingVisitAgain:
        return pendingVisit
          ? { label: 'Update visit (enter actual visit date)', icon: 'visit', open: open('editVisit', () => { setSelectedProposalId(proposal.id); setEditingVisit(pendingVisit); }) }
          : null;
      case CurrentStageEnum.PendingTermsFinalization:
        return {
          label: termSheet ? 'Edit terms' : 'Add terms',
          icon: 'terms',
          open: open('addTermSheetDetails', () => { setSelectedProposalId(proposal.id); setEditingTermSheet(termSheet || null); }),
        };
      case CurrentStageEnum.PendingAgreement:
        return termSheet
          ? { label: 'Record agreement / store opening', icon: 'agreement', open: open('recordAgreementAndStoreOpening', () => { setSelectedProposalId(proposal.id); setEditingTermSheet(termSheet); }) }
          : null;
      case CurrentStageEnum.PendingBrandFees:
        return { label: 'Edit proposal (invoice details)', icon: 'invoice', open: open('editProposal', () => setEditingProposal(proposal)) };
      default:
        return null;
    }
  };

  const renderProposalsView = () => (
    <ProposalsTable
      proposals={proposals}
      properties={properties}
      brands={brands}
      followUps={followUps}
      termSheetAgreements={termSheetAgreements}
      onViewDetails={handleViewProposalDetails}
      onEdit={(p) => { setEditingProposal(p); setCurrentView('editProposal'); }}
      onDelete={(id) => handleDeleteClick(id, 'proposal')}
      getUpdateAction={(p) => getProposalUpdateAction(p)}
      onUpdate={(p) => getProposalUpdateAction(p)?.open()}
      selectedStage={selectedStageFilter}
      toolbarInline
      toolbarTitle={selectedStageFilter === 'All' ? 'Proposal Workflow' : selectedStageFilter}
      toolbarLeadingAction={<Button onClick={() => handleViewChange('dashboard')}>Back to Dashboard</Button>}
      toolbarTabs={(
        <FilterTabs
          ariaLabel="Filter proposals by stage"
          activeId={selectedStageFilter}
          items={[
            { id: 'All', label: 'All', count: proposals.length },
            ...allProposalStages.map((stage) => ({
              id: stage,
              label: stage.replace(/^\d+\.\s*/, ''),
              count: stageCounts[stage] || 0,
            })),
          ]}
          onChange={(stage) => setSelectedStageFilter(stage as CurrentStageEnum | 'All')}
        />
      )}
      toolbarActions={<Button onClick={() => handleViewChange('addProposal')}>Create New Proposal</Button>}
    />
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView proposals={proposals} visits={visits} properties={properties} brands={brands} onStageClick={(stage) => { setSelectedStageFilter(stage); handleViewChange('proposals'); }} />;
      case 'properties':
        return (
          <div className="space-y-6">
            {renderPageHeader('Properties', {
              onBack: () => handleViewChange('dashboard'),
              backLabel: 'Back to Dashboard',
            })}
            <FilterTabs
              ariaLabel="Filter properties by status"
              activeId={selectedPropertyTaskFilter}
              items={[
                { id: 'All', label: 'All Properties', count: properties.length },
                ...propertyTaskStatuses.map((status) => ({
                  id: status,
                  label: getPropertyTaskLabel(status),
                  count: propertyTaskCounts[status] || 0,
                })),
              ]}
              onChange={(status) => setSelectedPropertyTaskFilter(status as PropertyTaskStatus | 'All')}
            />

            <PropertiesTable 
              properties={selectedPropertyTaskFilter === 'All' ? properties : properties.filter(p => getPropertyTaskStatus(p) === selectedPropertyTaskFilter)} 
              onRowClick={handleViewPropertyDetails}
              onEdit={(p) => handleEditPropertyView(p, 'properties')}
              getUpdateAction={(p) => getPropertyUpdateAction(p)}
              onUpdate={(p) => handleEditPropertyView(p, 'properties', getPropertyUpdateAction(p) ?? undefined)} 
              onDelete={(id) => handleDeleteClick(id, 'property')} 
              getStatusLabel={(property) => getPropertyTaskLabel(getPropertyTaskStatus(property))} 
              toolbarInline 
              toolbarActions={<Button onClick={handleAddPropertyView}>Add New Property</Button>} 
            />
          </div>
        );
      case 'propertyDetail': {
        const property = properties.find((item) => item.id === selectedPropertyId);
        return property ? (
          <PropertyDetailView
            property={property}
            statusLabel={getPropertyTaskLabel(getPropertyTaskStatus(property))}
            onBack={() => setCurrentView('properties')}
            onEdit={() => handleEditPropertyView(property, 'properties')}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-gray-700">Property details are unavailable.</p>
            <Button className="mt-4" onClick={() => setCurrentView('properties')}>Back to Properties</Button>
          </div>
        );
      }
      case 'propertyFeeFollowUp':
        // Redirect to properties view with the selected filter
        handleViewChange('properties');
        return null;
      case 'pendingDeposit':
        return (
          <>
            {renderPageHeader('Pending Deposit', {
              onBack: () => handleViewChange('dashboard'),
              backLabel: 'Back to Dashboard',
            })}
            <PendingDepositTable proposals={proposals} properties={properties} brands={brands} termSheetAgreements={termSheetAgreements} onUpdateDepositReceived={handleUpdateDepositReceived} toolbarInline />
          </>
        );
      case 'addProperty':
        return <PropertyForm onSubmit={handleAddProperty} onCancel={handleCancelForm} currentUserRole={currentUserRole} currentUserName={currentUserName} />;
      case 'editProperty':
        return editingProperty ? <PropertyForm key={`${editingProperty.id}-${propertyFormSection || 'all'}`} initialData={editingProperty} focusField={propertyFocusField} section={propertyFormSection} onSubmit={(payload) => handleUpdateProperty({ ...editingProperty, ...payload })} onCancel={handleCancelForm} currentUserRole={currentUserRole} currentUserName={currentUserName} /> : <div className="text-center py-8">Property not found for editing.</div>;
      case 'companyMaster':
        return <CompanyCategoryView mode="company" companyOptions={companyOptions} categoryOptions={categoryOptions} brands={brands} onAddCompany={addCompanyOption} onAddCategory={addCategoryOption} onRemoveCompany={removeCompanyOption} onRemoveCategory={removeCategoryOption} onBack={() => handleViewChange('dashboard')} />;
      case 'whatsappTemplates':
        return <WhatsAppTemplatesView onBack={() => handleViewChange('dashboard')} />;
      case 'viewSettings':
        return <ViewSettingsView initialSettings={viewSettings} canEdit={['Admin', 'Super Admin'].includes(currentUserRole)} onSaved={setViewSettings} onBack={() => handleViewChange('dashboard')} />;
      case 'categoryMaster':
        return <CompanyCategoryView mode="category" companyOptions={companyOptions} categoryOptions={categoryOptions} brands={brands} onAddCompany={addCompanyOption} onAddCategory={addCategoryOption} onRemoveCompany={removeCompanyOption} onRemoveCategory={removeCategoryOption} onBack={() => handleViewChange('dashboard')} />;
      case 'brands':
        return (
          <>
            {renderPageHeader('Brands', {
              onBack: () => handleViewChange('dashboard'),
              backLabel: 'Back to Dashboard',
            })}
            <BrandsTable brands={brands} onEdit={(b) => { setEditingBrand(b); setCurrentView('editBrand'); }} onDelete={(id) => handleDeleteClick(id, 'brand')} toolbarInline toolbarActions={<Button onClick={() => handleViewChange('addBrand')}>Add New Brand</Button>} />
          </>
        );
      case 'addBrand':
        return <BrandForm sidvinTeamMembers={sidvinTeamMembers} companyOptions={companyOptions} categoryOptions={categoryOptions} onSubmit={handleAddBrand} onCancel={handleCancelForm} currentUserName={currentUserName} />;
      case 'editBrand':
        return editingBrand ? <BrandForm initialData={editingBrand} sidvinTeamMembers={sidvinTeamMembers} companyOptions={companyOptions} categoryOptions={categoryOptions} onSubmit={(payload) => handleUpdateBrand({ ...editingBrand, ...payload })} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">Brand not found for editing.</div>;
      case 'sidvinTeam':
        return (
          <>
            {renderPageHeader('Sidvin Team', {
              onBack: () => handleViewChange('dashboard'),
              backLabel: 'Back to Dashboard',
            })}
            <SidvinTeamTable teamMembers={sidvinTeamMembers} onEdit={(m) => { setEditingTeamMember(m); setCurrentView('editTeamMember'); }} onDelete={(id) => handleDeleteClick(id, 'teamMember')} toolbarInline toolbarActions={<Button onClick={() => handleViewChange('addTeamMember')}>Add New Team Member</Button>} />
          </>
        );
      case 'addTeamMember':
        return <SidvinTeamForm onSubmit={handleAddTeamMember} onCancel={handleCancelForm} />;
      case 'editTeamMember':
        return editingTeamMember ? <SidvinTeamForm initialData={editingTeamMember} onSubmit={(payload) => handleUpdateTeamMember({ ...editingTeamMember, ...payload })} onCancel={handleCancelForm} /> : <div className="text-center py-8">Team Member not found for editing.</div>;
      case 'visits':
        return (
          <>
            {renderPageHeader('All Site Visits', {
              onBack: () => handleViewChange('dashboard'),
              backLabel: 'Back to Dashboard',
            })}
            <VisitsTable visits={visits} onEdit={(v) => { setEditingVisit(v); setCurrentView('editVisit'); }} onDelete={(id) => handleDeleteClick(id, 'visit')} toolbarInline />
          </>
        );
      case 'editVisit':
        return editingVisit ? <EditVisitForm proposalId={editingVisit.proposalId} initialData={editingVisit} sidvinTeamMembers={sidvinTeamMembers} onSubmit={handleUpdateVisit} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">Visit not found for editing.</div>;
      case 'scheduleVisit':
        return selectedProposalId ? <ScheduleVisitForm proposalId={selectedProposalId} onSubmit={handleScheduleVisit} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">No proposal selected to schedule visit.</div>;
      case 'termSheets':
        return (
          <>
            {renderPageHeader('All Terms', {
              onBack: () => handleViewChange('dashboard'),
              backLabel: 'Back to Dashboard',
            })}
            <TermSheetAgreementsTable termSheets={termSheetAgreements} onEdit={(ts) => { setEditingTermSheet(ts); setCurrentView('editTermSheetDetails'); }} onDelete={(id) => handleDeleteClick(id, 'termSheet')} toolbarInline />
          </>
        );
      case 'addTermSheetDetails':
      case 'editTermSheetDetails':
        return selectedProposalId ? <TermSheetAgreementForm proposalId={selectedProposalId} initialData={editingTermSheet || (termSheetAgreements.find(ts => ts.proposalId === selectedProposalId) || undefined)} onSubmit={handleAddOrUpdateTermSheetDetails} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">No proposal selected for terms.</div>;
      case 'recordAgreementAndStoreOpening':
        return selectedProposalId ? <RecordAgreementAndStoreOpeningForm proposalId={selectedProposalId} initialData={termSheetAgreements.find(ts => ts.proposalId === selectedProposalId)} onSubmit={handleRecordAgreementAndStoreOpeningDates} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">No proposal selected to record dates.</div>;
      case 'addFollowUp':
        return selectedProposalId ? <FollowUpForm proposalId={selectedProposalId} onSubmit={handleAddFollowUp} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">No proposal selected to add follow-up.</div>;
      case 'editFollowUp':
        return editingFollowUp ? <FollowUpForm proposalId={editingFollowUp.proposalId} initialData={editingFollowUp} onSubmit={handleUpdateFollowUp} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">Follow-up not found for editing.</div>;
      case 'proposals':
        return renderProposalsView();
      case 'addProposal':
        return <ProposalForm properties={properties} brands={brands} sidvinTeamMembers={sidvinTeamMembers} onSubmit={handleAddProposal} onCancel={handleCancelForm} currentUserName={currentUserName} />;
      case 'editProposal':
        const proposalForEdit = editingProposal || proposals.find(p => p.id === selectedProposalId);
        return proposalForEdit ? <ProposalForm initialData={proposalForEdit} properties={properties} brands={brands} sidvinTeamMembers={sidvinTeamMembers} onSubmit={(payload) => handleUpdateProposal({ ...proposalForEdit, ...payload })} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">Proposal not found for editing.</div>;
      case 'proposalDetail':
        const proposal = proposals.find(p => p.id === selectedProposalId);
        const propertyForProposal = properties.find(p => p.id === proposal?.propertyId);
        const brandForProposal = brands.find(b => b.id === proposal?.brandId);
        const visitsForProposal = visits.filter(v => v.proposalId === selectedProposalId);
        const followUpsForProposal = followUps.filter(fu => fu.proposalId === selectedProposalId);
        const termSheetForProposal = termSheetAgreements.find(ts => ts.proposalId === selectedProposalId);
        return proposal ? <ProposalDetailView proposal={proposal} property={propertyForProposal} brand={brandForProposal} visits={visitsForProposal} followUps={followUpsForProposal} termSheetAgreement={termSheetForProposal} onBack={() => handleViewChange('proposals')} onEditProposal={(p) => { setEditingProposal(p); setCurrentView('editProposal'); }} onScheduleVisit={(pId) => { setSelectedProposalId(pId); setCurrentView('scheduleVisit'); }} onEditVisit={(v) => { setEditingVisit(v); setCurrentView('editVisit'); }} onDeleteVisit={(id) => handleDeleteClick(id, 'visit')} onAddFollowUp={(pId) => { setSelectedProposalId(pId); setCurrentView('addFollowUp'); }} onEditFollowUp={(fu) => { setEditingFollowUp(fu); setCurrentView('editFollowUp'); }} onDeleteFollowUp={(id) => handleDeleteClick(id, 'followUp')} onAddOrEditTermSheetDetails={(pId, currentTs) => { setSelectedProposalId(pId); setEditingTermSheet(currentTs || null); setCurrentView('addTermSheetDetails'); }} onRecordAgreementDates={(pId, currentTs) => { setSelectedProposalId(pId); setEditingTermSheet(currentTs || null); setCurrentView('recordAgreementAndStoreOpening'); }} onDeleteTermSheet={(id) => handleDeleteClick(id, 'termSheet')} onDeleteReceipt={handleDeleteDepositReceipt} /> : renderProposalsView();
      default:
        return <div className="text-center py-8">Select a view from the navigation.</div>;
    }
  };

  const allProposalStages = Object.values(CurrentStageEnum);
  const stageCounts = allProposalStages.reduce((acc, stage) => {
    acc[stage] = proposals.filter(p => p.currentStage === stage).length;
    return acc;
  }, {} as Record<string, number>);
  const propertyTaskStatuses: PropertyTaskStatus[] = ['Pending Property Files', 'Pending Property Email', 'Pending Negotiation', 'Pending Acceptance Email', 'Pending MOU Signing', 'Accepted & Signed'];
  const propertyTaskCounts = propertyTaskStatuses.reduce((acc, status) => {
    acc[status] = properties.filter((p) => getPropertyTaskStatus(p) === status).length;
    return acc;
  }, {} as Record<PropertyTaskStatus, number>);
  const pendingDepositCount = termSheetAgreements.filter(ts => (ts.depositStages || []).some(ds => !ds.received)).length;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
              <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (portalMode === 'property') {
    return (
      <PropertyPortalView
        properties={properties}
        brands={brands}
        proposals={proposals}
        visits={visits}
        followUps={followUps}
        termSheetAgreements={termSheetAgreements}
        initialPropertyId={propertyPortalSessionId}
        onSessionStart={(next) => { void beginSession(next); }}
        onSessionEnd={endPropertySession}
        onRefresh={refreshData}
        onBackToTeamLogin={switchToTeamPortal}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginForm
        onSwitchToPropertyPortal={switchToPropertyPortal}
        onLogin={(next) => { void beginSession(next); }}
      />
    );
  }

  return (
    <div className="min-h-screen flex relative" data-color-theme={viewSettings.theme} data-sidebar-open={isSidebarOpen ? 'true' : 'false'}>
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close menu overlay"
        />
      )}
      <nav className={`sidvin-sidebar fixed inset-y-0 left-0 w-72 text-white p-4 shadow-lg z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto overscroll-contain [scrollbar-gutter:stable] flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="sidvin-sidebar-header">
          <div className="sidvin-nav-brand">
            <span className="sidvin-workspace-label">WORKSPACE</span>
            <span className="sidvin-nav-brand-name">{viewSettings.orgName || 'Sidvin'}</span>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="sidvin-sidebar-collapse"
            aria-label={isSidebarOpen ? 'Hide left menu' : 'Show left menu'}
            title={isSidebarOpen ? 'Hide left menu' : 'Show left menu'}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m13 6-6 6 6 6m6-12-6 6 6 6" />
            </svg>
          </button>
        </div>
        <ul className="sidvin-sidebar-menu space-y-1">
          <li><NavLink icon="dashboard" label="Dashboard" onClick={() => handleViewChange('dashboard')} isActive={currentView === 'dashboard'} /></li>
          <li><NavLink icon="proposal" label="Proposal" onClick={() => { setSelectedStageFilter('All'); handleViewChange('proposals'); }} isActive={currentView === 'proposals'} /></li>
          <li><NavLink icon="property" label="Property" onClick={() => { setSelectedPropertyTaskFilter('All'); handleViewChange('properties'); }} isActive={currentView === 'properties'} /></li>
          <li><SectionToggle icon="deposit" label="Deposit" isOpen={expandedSections.deposit} onClick={() => toggleSection('deposit')} /></li>
          {expandedSections.deposit && (
            <li><NavLink label={`Pending Deposit (${pendingDepositCount})`} onClick={() => handleViewChange('pendingDeposit')} isActive={currentView === 'pendingDeposit'} isSubItem /></li>
          )}
          <li><SectionToggle icon="master" label="Master" isOpen={expandedSections.masterData} onClick={() => toggleSection('masterData')} /></li>
          {expandedSections.masterData && (
            <>
              <li><NavLink icon="company" label={`Company (${companyMasterOptions.length})`} onClick={() => handleViewChange('companyMaster')} isActive={currentView === 'companyMaster'} isSubItem /></li>
              <li><NavLink icon="category" label={`Category (${categoryMasterOptions.length})`} onClick={() => handleViewChange('categoryMaster')} isActive={currentView === 'categoryMaster'} isSubItem /></li>
              <li><NavLink icon="brands" label={`Brands (${brands.length})`} onClick={() => handleViewChange('brands')} isActive={currentView === 'brands'} isSubItem /></li>
              <li><NavLink icon="team" label={`Sidvin Team (${sidvinTeamMembers.length})`} onClick={() => handleViewChange('sidvinTeam')} isActive={currentView === 'sidvinTeam'} isSubItem /></li>
              <li><NavLink icon="settings" label="View Settings" onClick={() => handleViewChange('viewSettings')} isActive={currentView === 'viewSettings'} isSubItem /></li>
              <li><NavLink icon="templates" label="WhatsApp Templates" onClick={() => handleViewChange('whatsappTemplates')} isActive={currentView === 'whatsappTemplates'} isSubItem /></li>
            </>
          )}
        </ul>
        <div className="sidvin-sidebar-profile">
          <div className="sidvin-profile-avatar">
            {currentUserName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="sidvin-profile-name">{currentUserName}</div>
            <div className="sidvin-profile-role">{currentUserRole}</div>
          </div>
        </div>
      </nav>

      <div className="flex-grow flex flex-col min-h-screen">
        <main className="flex-grow p-2 sm:p-4 overflow-y-auto">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 pb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSidebar}
                className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-orange-700 bg-orange-700 text-white hover:bg-orange-800"
                aria-label={isSidebarOpen ? 'Hide left menu' : 'Show left menu'}
                title={isSidebarOpen ? 'Hide left menu' : 'Show left menu'}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="text-sm px-3 py-2 bg-amber-50 text-amber-900 rounded-md font-medium border border-amber-200 flex items-center justify-between gap-3">
                <span>Welcome, {currentUserName} {currentUserRole ? `(${currentUserRole})` : ''}</span>
                <button
                  type="button"
                  onClick={() => { void logout(); }}
                  className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded border border-red-200 font-semibold transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
	              <img src={viewSettings.logoDataUrl || "https://i.ibb.co/kVFQsG9R/Whats-App-Image-2026-04-06-at-4-35-52-PM-1.jpg"} alt="Sidvin Logo" className="h-16 md:h-20 w-auto object-contain" />
            </div>
          </div>
          {renderContent()}
        </main>
      </div>
      {isSaving && (
        <div className="fixed inset-0 z-[70] bg-black/20 flex items-center justify-center">
          <div className="bg-[#ece8e3] px-6 py-5 rounded-lg shadow-lg flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
            <p className="text-sm text-black">{savingMessage}</p>
          </div>
        </div>
      )}
      {pendingWhatsAppSave && (
        <WhatsAppConfirmModal
          title={pendingWhatsAppSave.title}
          subtitle={pendingWhatsAppSave.subtitle}
          event={pendingWhatsAppSave.event}
          record={pendingWhatsAppSave.record}
          defaultSend={pendingWhatsAppSave.defaultSend}
          onConfirm={(sides) => { void confirmWhatsAppSave(sides); }}
          onCancel={() => setPendingWhatsAppSave(null)}
        />
      )}
      <DeleteConfirmationModal isOpen={showDeleteConfirm} onClose={handleCloseDeleteConfirm} onConfirm={handleConfirmDelete} title={`Delete ${itemToDelete?.type}?`} message={`Are you sure you want to delete ${itemToDelete?.name || itemToDelete?.type}? This action cannot be undone.`} error={deleteError} isProcessing={isSaving} />
    </div>
  );
};

type SidebarIconName = 'dashboard' | 'proposal' | 'property' | 'deposit' | 'master' | 'company' | 'category' | 'brands' | 'team' | 'settings' | 'templates';

interface NavLinkProps {
  label: string;
  onClick: () => void;
  isActive: boolean;
  isSubItem?: boolean;
  icon?: SidebarIconName;
}

interface SectionToggleProps {
  label: string;
  isOpen: boolean;
  onClick: () => void;
  icon: SidebarIconName;
}

const SidebarIcon: React.FC<{ name: SidebarIconName; className?: string }> = ({ name, className = 'h-5 w-5' }) => {
  const paths: Record<SidebarIconName, string> = {
    dashboard: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
    proposal: 'M7 3.75h7l4.5 4.5v12H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2ZM14 4v5h5M8.5 13h7M8.5 16.5h7',
    property: 'M4 21V6l8-3 8 3v15M8 8h1m6 0h1M8 12h1m6 0h1M10 21v-5h4v5',
    deposit: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3ZM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
    master: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.8 1.8 0 0 0-1.9.1l-.2.1h-3.5l-.1-.2a1.8 1.8 0 0 0-1.6-1.1 1.8 1.8 0 0 0-1.6 1.1l-.1.2H5.3l-.1-.2a1.8 1.8 0 0 0-1.7-1.1H3.3l-1.8-3.1.1-.1a1.7 1.7 0 0 0 .3-1.9l-.1-.2v-3.5l.2-.1a1.8 1.8 0 0 0 1.1-1.6A1.8 1.8 0 0 0 2 8l-.2-.1 1.8-3.1h.2a1.8 1.8 0 0 0 1.7-1.1l.1-.2h3.5l.1.2a1.8 1.8 0 0 0 1.6 1.1 1.8 1.8 0 0 0 1.6-1.1l.1-.2h3.5l.1.2a1.8 1.8 0 0 0 1.7 1.1h.2l1.8 3.1-.1.1a1.7 1.7 0 0 0-.3 1.9l.1.2v3.5l-.2.1a1.8 1.8 0 0 0-1.1 1.6Z',
    company: 'M4 21V5h11v16M15 9h5v12M7 8h2m2 0h1M7 12h2m2 0h1M7 16h2m2 0h1m4-3h2m-2 4h2M2 21h20',
    category: 'm20.6 13.4-7.2 7.2a2 2 0 0 1-2.8 0L3 13V4h9l8.6 8.6a.6.6 0 0 1 0 .8ZM7.5 8.5h.01',
    brands: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z',
    team: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20m4-12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm9 2a3 3 0 1 0 0-6m5 16v-1.5a4 4 0 0 0-3-3.9',
    settings: 'M4 6h5m4 0h7M4 12h9m4 0h3M4 18h2m4 0h10M11 4v4m4 2v4M8 16v4',
    templates: 'M21 11.5a8.4 8.4 0 0 1-8.8 8.4 9 9 0 0 1-4-.9L3 20l1.2-4.5a8 8 0 1 1 16.8-4Zm-12-1h.01M12 10.5h.01m3 0h.01',
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

const SectionToggle: React.FC<SectionToggleProps> = ({ label, isOpen, onClick, icon }) => (
  <button type="button" onClick={onClick} aria-expanded={isOpen} className="sidvin-section-toggle">
    <span className="sidvin-nav-label"><SidebarIcon name={icon} /><span>{label}</span></span>
    <svg className={`sidvin-chevron ${isOpen ? 'is-open' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 8 4 4 4-4" />
    </svg>
  </button>
);

const NavLink: React.FC<NavLinkProps> = ({ label, onClick, isActive, isSubItem = false, icon }) => {
  const countMatch = isSubItem ? label.match(/^(.*) \((\d+)\)$/) : null;
  return (
    <button type="button" onClick={onClick} className={`sidvin-nav-link ${isSubItem ? 'sidvin-nav-sub-link' : ''} ${isActive ? 'is-active' : ''}`}>
      <span className="sidvin-nav-label">
        {icon && <SidebarIcon name={icon} />}
        <span className="sidvin-nav-link-text">{countMatch ? countMatch[1] : label}</span>
      </span>
      {countMatch && <span className="sidvin-nav-count">{countMatch[2]}</span>}
    </button>
  );
};

interface FilterTabItem {
  id: string;
  label: string;
  count: number;
}

const FilterTabs: React.FC<{
  ariaLabel: string;
  activeId: string;
  items: FilterTabItem[];
  onChange: (id: string) => void;
}> = ({ ariaLabel, activeId, items, onChange }) => (
  <div className="sidvin-view-tabs" role="tablist" aria-label={ariaLabel}>
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={activeId === item.id}
        onClick={() => onChange(item.id)}
        className={`sidvin-view-tab ${activeId === item.id ? 'is-active' : ''}`}
      >
        <span>{item.label}</span>
        <span className="sidvin-view-tab-count">{item.count}</span>
      </button>
    ))}
  </div>
);

export default App;

