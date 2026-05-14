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
import DashboardView from './components/views/DashboardView';
import CompanyCategoryView from './components/views/CompanyCategoryView';
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
  | 'brands'
  | 'visits'
  | 'termSheets'
  | 'sidvinTeam'
  | 'propertyFeeFollowUp'
  | 'pendingDeposit'
  | 'companyMaster'
  | 'categoryMaster'
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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
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

  const [activeUserId, setActiveUserId] = useState<string>(localStorage.getItem('sidvinActiveUserId') || '');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('sidvinActiveUserId'));
  const [portalMode, setPortalMode] = useState<PortalMode>(localStorage.getItem('sidvinPortalMode') === 'property' ? 'property' : 'team');
  const [propertyPortalSessionId, setPropertyPortalSessionId] = useState<string>(localStorage.getItem('sidvinPropertyPortalId') || '');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('Submitting...');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    proposalStages: false,
    propertyTasks: false,
    deposit: false,
    masterData: false,
  });

  const fetchData = useCallback(async () => {
    const [props, brs, vsts, terms, team, fus, prs, companies, categories] = await Promise.all([
      dataService.getProperties(),
      dataService.getBrands(),
      dataService.getVisits(),
      dataService.getTermSheetAgreements(),
      dataService.getSidvinTeamMembers(),
      dataService.getFollowUps(),
      dataService.getProposals(),
      dataService.getCompanyMasterOptions(),
      dataService.getCategoryMasterOptions(),
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

    // activeUserId is now set from the LoginForm, so we don't automatically assign the first user here anymore.
  }, []);

  useEffect(() => {
    fetchData()
      .catch((err) => console.error(err))
      .finally(() => setIsInitialLoading(false));
  }, [fetchData]);

  const activeUser = sidvinTeamMembers.find(m => m.id === activeUserId) || sidvinTeamMembers[0];
  const currentUserName = activeUser?.name || 'System';
  const currentUserRole = activeUser?.role || 'Employee';

  const refreshData = async () => {
    await fetchData();
  };

  const switchToTeamPortal = () => {
    setPortalMode('team');
    localStorage.setItem('sidvinPortalMode', 'team');
    setPropertyPortalSessionId('');
    localStorage.removeItem('sidvinPropertyPortalId');
  };

  const switchToPropertyPortal = () => {
    setPortalMode('property');
    localStorage.setItem('sidvinPortalMode', 'property');
    localStorage.removeItem('sidvinActiveUserId');
    setActiveUserId('');
    setIsAuthenticated(false);
  };

  const startPropertySession = (propertyId: string) => {
    setPropertyPortalSessionId(propertyId);
    localStorage.setItem('sidvinPropertyPortalId', propertyId);
    setPortalMode('property');
    localStorage.setItem('sidvinPortalMode', 'property');
  };

  const endPropertySession = () => {
    setPropertyPortalSessionId('');
    localStorage.removeItem('sidvinPropertyPortalId');
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
    setCurrentView(view);
    setIsSidebarOpen(false);
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

  const getPropertyTaskLabel = (status: PropertyTaskStatus) => {
    if (status === 'Pending Property Email') return 'Pending Service Fee Email';
    if (status === 'Pending MOU Signing') return 'Pending MOU Signing';
    return status;
  };

  const handleViewProposalDetails = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setCurrentView('proposalDetail');
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

  const handlePropertyTaskView = (status: PropertyTaskStatus) => {
    setSelectedPropertyTaskFilter(status);
    handleViewChange('properties');
  };

  const handleAddPropertyView = () => {
    setPropertyReturnView('properties');
    handleViewChange('addProperty');
  };

  const handleEditPropertyView = (property: Property, returnView: 'properties' | 'propertyFeeFollowUp') => {
    setPropertyReturnView('properties'); // Always return to unified view
    setEditingProperty(property);
    setCurrentView('editProperty');
  };

  const toggleSection = (section: 'proposalStages' | 'propertyTasks' | 'deposit' | 'masterData') => {
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

  const handleAddProperty = async (newProperty: Omit<Property, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    handleViewChange('properties');
    await runWithSaving('Adding Property...', async () => {
      await dataService.addProperty(newProperty, currentUserName);
      await refreshData();
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
    handleViewChange('brands');
    await runWithSaving('Adding Brand...', async () => {
      await dataService.addBrand(newBrand, currentUserName);
      await refreshData();
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
    handleViewChange('proposals');
    await runWithSaving('Adding Proposal...', async () => {
      await dataService.addProposal(newProposal, currentUserName);
      await refreshData();
    });
  };

  const handleUpdateProposal = async (updatedProposal: Proposal) => {
    handleViewChange('proposals');
    await runWithSaving('Updating Proposal...', async () => {
      await dataService.updateProposal(updatedProposal, currentUserName);
      await refreshData();
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
    setCurrentView('proposalDetail');
    await runWithSaving('Scheduling Visit...', async () => {
      await dataService.addVisit(newVisit, currentUserName);
      await refreshData();
    });
  };

  const handleUpdateVisit = async (updatedVisit: Omit<Visit, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    if (!editingVisit) return;
    setCurrentView('proposalDetail');
    await runWithSaving('Updating Visit...', async () => {
      await dataService.updateVisit({ ...editingVisit, ...updatedVisit }, currentUserName);
      await refreshData();
    });
  };

  const handleAddFollowUp = async (newFollowUp: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>, actionToTake?: 'scheduleVisit') => {
    setCurrentView(actionToTake === 'scheduleVisit' ? 'scheduleVisit' : 'proposalDetail');
    await runWithSaving('Adding Follow Up...', async () => {
      await dataService.addFollowUp(newFollowUp, currentUserName);
      await refreshData();
      if (actionToTake === 'scheduleVisit') {
        setSelectedProposalId(newFollowUp.proposalId);
        setCurrentView('scheduleVisit');
      } else {
        setCurrentView('proposalDetail');
      }
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
    handleViewChange('proposalDetail');
    await runWithSaving('Saving Terms...', async () => {
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
    });
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
    handleViewChange('proposalDetail');
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

    if (selectedProposalId) {
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

  const renderProposalsView = () => (
    <>
      {renderPageHeader(selectedStageFilter === 'All' ? 'Proposal Workflow' : selectedStageFilter, {
        onBack: () => handleViewChange('dashboard'),
        backLabel: 'Back to Dashboard',
      })}
      <ProposalsTable proposals={proposals} properties={properties} brands={brands} followUps={followUps} termSheetAgreements={termSheetAgreements} onViewDetails={handleViewProposalDetails} onEdit={(p) => { setEditingProposal(p); setCurrentView('editProposal'); }} onDelete={(id) => handleDeleteClick(id, 'proposal')} selectedStage={selectedStageFilter} toolbarInline toolbarActions={<Button onClick={() => handleViewChange('addProposal')}>Create New Proposal</Button>} />
    </>
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

            <PropertiesTable 
              properties={selectedPropertyTaskFilter === 'All' ? properties : properties.filter(p => getPropertyTaskStatus(p) === selectedPropertyTaskFilter)} 
              onEdit={(p) => handleEditPropertyView(p, 'properties')} 
              onDelete={(id) => handleDeleteClick(id, 'property')} 
              getStatusLabel={(property) => getPropertyTaskLabel(getPropertyTaskStatus(property))} 
              toolbarInline 
              toolbarActions={<Button onClick={handleAddPropertyView}>Add New Property</Button>} 
            />
          </div>
        );
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
        return editingProperty ? <PropertyForm initialData={editingProperty} onSubmit={(payload) => handleUpdateProperty({ ...editingProperty, ...payload })} onCancel={handleCancelForm} currentUserRole={currentUserRole} currentUserName={currentUserName} /> : <div className="text-center py-8">Property not found for editing.</div>;
      case 'companyMaster':
        return <CompanyCategoryView mode="company" companyOptions={companyOptions} categoryOptions={categoryOptions} brands={brands} onAddCompany={addCompanyOption} onAddCategory={addCategoryOption} onRemoveCompany={removeCompanyOption} onRemoveCategory={removeCategoryOption} onBack={() => handleViewChange('dashboard')} />;
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
        onSessionStart={startPropertySession}
        onSessionEnd={endPropertySession}
        onRefresh={refreshData}
        onBackToTeamLogin={switchToTeamPortal}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginForm
        teamMembers={sidvinTeamMembers}
        onSwitchToPropertyPortal={switchToPropertyPortal}
        onLogin={(userId) => {
          localStorage.setItem('sidvinActiveUserId', userId);
          localStorage.setItem('sidvinPortalMode', 'team');
          setActiveUserId(userId);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex relative">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close menu overlay"
        />
      )}
      <nav className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-amber-800 to-amber-800 text-white p-4 shadow-lg z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto overscroll-contain [scrollbar-gutter:stable] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-4 px-3 flex items-start justify-between gap-3">
          <h1 className="text-xl font-extrabold tracking-wide">Proposal Management</h1>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="text-white/80 hover:text-white"
            aria-label="Close menu"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="space-y-1">
          <li><NavLink label={`Dashboard`} onClick={() => handleViewChange('dashboard')} isActive={currentView === 'dashboard'} /></li>
          <li><SectionToggle label="Proposal" isOpen={expandedSections.proposalStages} onClick={() => toggleSection('proposalStages')} /></li>
          {expandedSections.proposalStages && (
            <>
              <li><NavLink label={`All Proposals (${proposals.length})`} onClick={() => { handleViewChange('proposals'); setSelectedStageFilter('All'); }} isActive={currentView === 'proposals' && selectedStageFilter === 'All'} isSubItem /></li>
              {allProposalStages.map(stage => <li key={stage}><NavLink label={`${stage} (${stageCounts[stage] || 0})`} onClick={() => { handleViewChange('proposals'); setSelectedStageFilter(stage); }} isActive={currentView === 'proposals' && selectedStageFilter === stage} isSubItem /></li>)}
            </>
          )}
          <li><SectionToggle label="Property" isOpen={expandedSections.propertyTasks} onClick={() => toggleSection('propertyTasks')} /></li>
          {expandedSections.propertyTasks && (
            <>
              <li><NavLink label={`Properties (${properties.length})`} onClick={() => { handleViewChange('properties'); setSelectedPropertyTaskFilter('All'); }} isActive={currentView === 'properties' && selectedPropertyTaskFilter === 'All'} isSubItem /></li>
              {propertyTaskStatuses.map((status) => (
                <li key={status}>
                  <NavLink
                    label={`${getPropertyTaskLabel(status)} (${propertyTaskCounts[status] || 0})`}
                    onClick={() => handlePropertyTaskView(status)}
                    isActive={currentView === 'properties' && selectedPropertyTaskFilter === status}
                    isSubItem
                  />
                </li>
              ))}
            </>
          )}
          <li><SectionToggle label="Deposit" isOpen={expandedSections.deposit} onClick={() => toggleSection('deposit')} /></li>
          {expandedSections.deposit && (
            <>
              <li><NavLink label={`Pending Deposit (${pendingDepositCount})`} onClick={() => handleViewChange('pendingDeposit')} isActive={currentView === 'pendingDeposit'} isSubItem /></li>
            </>
          )}
          <li><SectionToggle label="Master" isOpen={expandedSections.masterData} onClick={() => toggleSection('masterData')} /></li>
          {expandedSections.masterData && (
            <>
              <li><NavLink label={`Company (${companyMasterOptions.length})`} onClick={() => handleViewChange('companyMaster')} isActive={currentView === 'companyMaster'} isSubItem /></li>
              <li><NavLink label={`Category (${categoryMasterOptions.length})`} onClick={() => handleViewChange('categoryMaster')} isActive={currentView === 'categoryMaster'} isSubItem /></li>
              <li><NavLink label={`Brands (${brands.length})`} onClick={() => handleViewChange('brands')} isActive={currentView === 'brands'} isSubItem /></li>
              <li><NavLink label={`Sidvin Team (${sidvinTeamMembers.length})`} onClick={() => handleViewChange('sidvinTeam')} isActive={currentView === 'sidvinTeam'} isSubItem /></li>
            </>
          )}
        </ul>
      </nav>

      <div className="flex-grow flex flex-col min-h-screen">
        <main className="flex-grow p-2 sm:p-4 overflow-y-auto">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 pb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-orange-700 bg-orange-700 text-white hover:bg-orange-800"
                aria-label="Open menu"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="text-sm px-3 py-2 bg-amber-50 text-amber-900 rounded-md font-medium border border-amber-200 flex items-center justify-between gap-3">
                <span>Welcome, {currentUserName} {currentUserRole ? `(${currentUserRole})` : ''}</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('sidvinActiveUserId');
                    setActiveUserId('');
                    setIsAuthenticated(false);
                  }}
                  className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded border border-red-200 font-semibold transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
	              <img src="https://i.ibb.co/kVFQsG9R/Whats-App-Image-2026-04-06-at-4-35-52-PM-1.jpg" alt="Sidvin Logo" className="h-16 md:h-20 w-auto object-contain" />
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
      <DeleteConfirmationModal isOpen={showDeleteConfirm} onClose={handleCloseDeleteConfirm} onConfirm={handleConfirmDelete} title={`Delete ${itemToDelete?.type}?`} message={`Are you sure you want to delete ${itemToDelete?.name || itemToDelete?.type}? This action cannot be undone.`} error={deleteError} isProcessing={isSaving} />
    </div>
  );
};

interface NavLinkProps {
  label: string;
  onClick: () => void;
  isActive: boolean;
  isSubItem?: boolean;
}

interface SectionToggleProps {
  label: string;
  isOpen: boolean;
  onClick: () => void;
}

const SectionToggle: React.FC<SectionToggleProps> = ({ label, isOpen, onClick }) => (
  <button type="button" onClick={onClick} className="w-full flex items-center justify-between text-left py-2 px-3 rounded-md font-semibold hover:bg-amber-700 hover:text-white transition duration-150 ease-in-out">
    <span>{label}</span>
    <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  </button>
);

const NavLink: React.FC<NavLinkProps> = ({ label, onClick, isActive, isSubItem = false }) => (
  <button type="button" onClick={onClick} className={`w-full text-left py-2 px-3 rounded-md transition duration-150 ease-in-out ${isActive ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-amber-700 hover:text-white'} ${isSubItem ? 'ml-4 text-sm' : 'font-medium'}`}>{label}</button>
);

export default App;
