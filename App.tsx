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
import PropertiesTable from './components/tables/PropertiesTable';
import BrandsTable from './components/tables/BrandsTable';
import ProposalsTable from './components/tables/ProposalsTable';
import VisitsTable from './components/tables/VisitsTable';
import TermSheetAgreementsTable from './components/tables/TermSheetAgreementsTable';
import SidvinTeamTable from './components/tables/SidvinTeamTable';
import ProposalDetailView from './components/views/ProposalDetailView';
import DashboardView from './components/views/DashboardView';
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

type View =
  | 'dashboard'
  | 'proposals'
  | 'properties'
  | 'brands'
  | 'visits'
  | 'termSheets'
  | 'sidvinTeam'
  | 'successStories'
  | 'propertyFeeFollowUp'
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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [properties, setProperties] = useState<Property[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [termSheetAgreements, setTermSheetAgreements] = useState<TermSheetAgreement[]>([]);
  const [sidvinTeamMembers, setSidvinTeamMembers] = useState<SidvinTeamMember[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editingTermSheet, setEditingTermSheet] = useState<TermSheetAgreement | null>(null);
  const [editingTeamMember, setEditingTeamMember] = useState<SidvinTeamMember | null>(null);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  const [selectedStageFilter, setSelectedStageFilter] = useState<CurrentStageEnum | 'All'>('All');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: string; name?: string } | null>(null);
  const [deleteCallback, setDeleteCallback] = useState<(() => void) | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [activeUserId, setActiveUserId] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('Submitting...');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [props, brs, vsts, terms, team, fus, prs] = await Promise.all([
      dataService.getProperties(),
      dataService.getBrands(),
      dataService.getVisits(),
      dataService.getTermSheetAgreements(),
      dataService.getSidvinTeamMembers(),
      dataService.getFollowUps(),
      dataService.getProposals(),
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

    if (!activeUserId && team.length > 0) setActiveUserId(team[0].id);
  }, [activeUserId]);

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

  const handleViewProposalDetails = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setCurrentView('proposalDetail');
  };

  const handleAddProperty = async (newProperty: Omit<Property, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    handleViewChange('properties');
    await runWithSaving('Adding Property...', async () => {
      await dataService.addProperty(newProperty, currentUserName);
      await refreshData();
    });
  };

  const handleUpdateProperty = async (updatedProperty: Property) => {
    handleViewChange('properties');
    await runWithSaving('Updating Property...', async () => {
      await dataService.updateProperty(updatedProperty, currentUserName);
      await refreshData();
    });
  };

  const handleAddBrand = async (newBrand: Omit<Brand, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => {
    handleViewChange('brands');
    await runWithSaving('Adding Brand...', async () => {
      await dataService.addBrand(newBrand, currentUserName);
      await refreshData();
    });
  };

  const handleUpdateBrand = async (updatedBrand: Brand) => {
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
    agreementDate: string | null,
    agreementRegistrationDate: string | null,
    storeOpeningDate: string | null
  ) => {
    handleViewChange('proposalDetail');
    await runWithSaving('Updating Agreement...', async () => {
      await dataService.updateAgreementDates(proposalId, agreementDate, agreementRegistrationDate, currentUserName);
      await dataService.updateStoreOpeningDate(proposalId, storeOpeningDate, currentUserName);
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
      if (currentView.includes('Property')) setCurrentView('properties');
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
      const isTeamMemberDelete = type === 'teamMember';
      try {
        if (isTeamMemberDelete) {
          setSavingMessage('Deleting Team Member...');
          setIsSaving(true);
        }
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
        if (isTeamMemberDelete) {
          setIsSaving(false);
        }
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

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView proposals={proposals} visits={visits} properties={properties} brands={brands} onStageClick={(stage) => { setSelectedStageFilter(stage); handleViewChange('proposals'); }} />;
      case 'properties':
        return (<><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900">Properties Master Data</h1><Button onClick={() => handleViewChange('addProperty')}>Add New Property</Button></div><PropertiesTable properties={properties} onEdit={(p) => { setEditingProperty(p); setCurrentView('editProperty'); }} onDelete={(id) => handleDeleteClick(id, 'property')} /></>);
      case 'propertyFeeFollowUp':
        const pendingPropertyFee = properties.filter((p) => !p.propertyFeeEmailSent || p.propertyFeeStatus === 'Pending Follow Up' || p.propertyFeeStatus === 'Negotiation Required');
        return (<><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900">Pending Property Fee Follow Up</h1></div><PropertiesTable properties={pendingPropertyFee} onEdit={(p) => { setEditingProperty(p); setCurrentView('editProperty'); }} /></>);
      case 'addProperty':
        return <PropertyForm onSubmit={handleAddProperty} onCancel={handleCancelForm} currentUserRole={currentUserRole} currentUserName={currentUserName} />;
      case 'editProperty':
        return editingProperty ? <PropertyForm initialData={editingProperty} onSubmit={(payload) => handleUpdateProperty({ ...editingProperty, ...payload })} onCancel={handleCancelForm} currentUserRole={currentUserRole} currentUserName={currentUserName} /> : <div className="text-center py-8">Property not found for editing.</div>;
      case 'brands':
        return (<><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900">Brands Master Data</h1><Button onClick={() => handleViewChange('addBrand')}>Add New Brand</Button></div><BrandsTable brands={brands} onEdit={(b) => { setEditingBrand(b); setCurrentView('editBrand'); }} onDelete={(id) => handleDeleteClick(id, 'brand')} /></>);
      case 'addBrand':
        return <BrandForm sidvinTeamMembers={sidvinTeamMembers} onSubmit={handleAddBrand} onCancel={handleCancelForm} currentUserName={currentUserName} />;
      case 'editBrand':
        return editingBrand ? <BrandForm initialData={editingBrand} sidvinTeamMembers={sidvinTeamMembers} onSubmit={(payload) => handleUpdateBrand({ ...editingBrand, ...payload })} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">Brand not found for editing.</div>;
      case 'sidvinTeam':
        return (<><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900">Sidvin Team Members</h1><Button onClick={() => handleViewChange('addTeamMember')}>Add New Team Member</Button></div><SidvinTeamTable teamMembers={sidvinTeamMembers} onEdit={(m) => { setEditingTeamMember(m); setCurrentView('editTeamMember'); }} onDelete={(id) => handleDeleteClick(id, 'teamMember')} /></>);
      case 'addTeamMember':
        return <SidvinTeamForm onSubmit={handleAddTeamMember} onCancel={handleCancelForm} />;
      case 'editTeamMember':
        return editingTeamMember ? <SidvinTeamForm initialData={editingTeamMember} onSubmit={(payload) => handleUpdateTeamMember({ ...editingTeamMember, ...payload })} onCancel={handleCancelForm} /> : <div className="text-center py-8">Team Member not found for editing.</div>;
      case 'visits':
        return (<><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900">All Site Visits</h1></div><VisitsTable visits={visits} onEdit={(v) => { setEditingVisit(v); setCurrentView('editVisit'); }} onDelete={(id) => handleDeleteClick(id, 'visit')} /></>);
      case 'editVisit':
        return editingVisit ? <EditVisitForm proposalId={editingVisit.proposalId} initialData={editingVisit} sidvinTeamMembers={sidvinTeamMembers} onSubmit={handleUpdateVisit} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">Visit not found for editing.</div>;
      case 'scheduleVisit':
        return selectedProposalId ? <ScheduleVisitForm proposalId={selectedProposalId} onSubmit={handleScheduleVisit} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">No proposal selected to schedule visit.</div>;
      case 'termSheets':
        return (<><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900">All Terms</h1></div><TermSheetAgreementsTable termSheets={termSheetAgreements} onEdit={(ts) => { setEditingTermSheet(ts); setCurrentView('editTermSheetDetails'); }} onDelete={(id) => handleDeleteClick(id, 'termSheet')} /></>);
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
        return (<><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900">Proposal Workflow</h1><Button onClick={() => handleViewChange('addProposal')}>Create New Proposal</Button></div><ProposalsTable proposals={proposals} properties={properties} brands={brands} followUps={followUps} termSheetAgreements={termSheetAgreements} onViewDetails={handleViewProposalDetails} onEdit={(p) => { setEditingProposal(p); setCurrentView('editProposal'); }} onDelete={(id) => handleDeleteClick(id, 'proposal')} selectedStage={selectedStageFilter} /></>);
      case 'addProposal':
        return <ProposalForm properties={properties} brands={brands} sidvinTeamMembers={sidvinTeamMembers} onSubmit={handleAddProposal} onCancel={handleCancelForm} currentUserName={currentUserName} />;
      case 'editProposal':
        const proposalForEdit = editingProposal || proposals.find(p => p.id === selectedProposalId);
        return proposalForEdit ? <ProposalForm initialData={proposalForEdit} properties={properties} brands={brands} sidvinTeamMembers={sidvinTeamMembers} onSubmit={(payload) => handleUpdateProposal({ ...proposalForEdit, ...payload })} onCancel={handleCancelForm} currentUserName={currentUserName} /> : <div className="text-center py-8">Proposal not found for editing.</div>;
      case 'successStories':
        const successful = proposals.filter(p => p.currentStage === CurrentStageEnum.CompletedProposal);
        return (<><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900">Success Stories</h1></div><div className="bg-[#ece8e3] border border-gray-200 rounded-lg p-4">{successful.length === 0 ? <p className="text-gray-600">No billed proposals yet.</p> : <ul className="space-y-3">{successful.map(p => <li key={p.id} className="border border-gray-200 rounded p-3 flex items-center justify-between"><div><div className="font-semibold text-gray-900">{brands.find(b => b.id === p.brandId)?.name || 'N/A'} at {properties.find(pr => pr.id === p.propertyId)?.address || 'N/A'}</div><div className="text-sm text-gray-600">Invoice: {p.invoiceNo || 'N/A'} | Amount: {p.invoiceAmount ?? 'N/A'}</div></div><Button size="sm" variant="secondary" onClick={() => handleViewProposalDetails(p.id)}>View</Button></li>)}</ul>}</div></>);
      case 'proposalDetail':
        const proposal = proposals.find(p => p.id === selectedProposalId);
        const propertyForProposal = properties.find(p => p.id === proposal?.propertyId);
        const brandForProposal = brands.find(b => b.id === proposal?.brandId);
        const visitsForProposal = visits.filter(v => v.proposalId === selectedProposalId);
        const followUpsForProposal = followUps.filter(fu => fu.proposalId === selectedProposalId);
        const termSheetForProposal = termSheetAgreements.find(ts => ts.proposalId === selectedProposalId);
        return proposal ? <ProposalDetailView proposal={proposal} property={propertyForProposal} brand={brandForProposal} visits={visitsForProposal} followUps={followUpsForProposal} termSheetAgreement={termSheetForProposal} onBack={() => handleViewChange('proposals')} onEditProposal={(p) => { setEditingProposal(p); setCurrentView('editProposal'); }} onScheduleVisit={(pId) => { setSelectedProposalId(pId); setCurrentView('scheduleVisit'); }} onEditVisit={(v) => { setEditingVisit(v); setCurrentView('editVisit'); }} onDeleteVisit={(id) => handleDeleteClick(id, 'visit')} onAddFollowUp={(pId) => { setSelectedProposalId(pId); setCurrentView('addFollowUp'); }} onEditFollowUp={(fu) => { setEditingFollowUp(fu); setCurrentView('editFollowUp'); }} onDeleteFollowUp={(id) => handleDeleteClick(id, 'followUp')} onAddOrEditTermSheetDetails={(pId, currentTs) => { setSelectedProposalId(pId); setEditingTermSheet(currentTs || null); setCurrentView('addTermSheetDetails'); }} onRecordAgreementDates={(pId, currentTs) => { setSelectedProposalId(pId); setEditingTermSheet(currentTs || null); setCurrentView('recordAgreementAndStoreOpening'); }} onDeleteTermSheet={(id) => handleDeleteClick(id, 'termSheet')} /> : <div className="text-center py-8">Proposal details not found.</div>;
      default:
        return <div className="text-center py-8">Select a view from the navigation.</div>;
    }
  };

  const allProposalStages = Object.values(CurrentStageEnum);
  const stageCounts = allProposalStages.reduce((acc, stage) => {
    acc[stage] = proposals.filter(p => p.currentStage === stage).length;
    return acc;
  }, {} as Record<string, number>);
  const pendingPropertyFeeCount = properties.filter((p) => !p.propertyFeeEmailSent || p.propertyFeeStatus === 'Pending Follow Up' || p.propertyFeeStatus === 'Negotiation Required' || p.propertyFeeStatus === 'Pending Email' || p.propertyFeeStatus === 'Pending Acceptance Email' || p.propertyFeeStatus === 'Pending Papers Signing').length;
  const successStoriesCount = proposals.filter(p => p.currentStage === CurrentStageEnum.CompletedProposal).length;

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
          <li><NavLink label={`All Proposals (${proposals.length})`} onClick={() => { handleViewChange('proposals'); setSelectedStageFilter('All'); }} isActive={currentView === 'proposals' && selectedStageFilter === 'All'} /></li>
          <li><NavLink label={`Success Stories (${successStoriesCount})`} onClick={() => handleViewChange('successStories')} isActive={currentView === 'successStories'} /></li>
          <li className="text-amber-100 font-semibold mt-4 mb-2 px-3 text-sm uppercase tracking-wider">Proposal Stages</li>
          {allProposalStages.map(stage => <li key={stage}><NavLink label={`${stage} (${stageCounts[stage] || 0})`} onClick={() => { handleViewChange('proposals'); setSelectedStageFilter(stage); }} isActive={currentView === 'proposals' && selectedStageFilter === stage} isSubItem /></li>)}
          <li className="text-amber-100 font-semibold mt-6 mb-2 px-3 text-sm uppercase tracking-wider">Master Data</li>
          <li><NavLink label={`Properties (${properties.length})`} onClick={() => handleViewChange('properties')} isActive={currentView === 'properties'} /></li>
          <li><NavLink label={`Property Fee Follow Up (${pendingPropertyFeeCount})`} onClick={() => handleViewChange('propertyFeeFollowUp')} isActive={currentView === 'propertyFeeFollowUp'} /></li>
          <li><NavLink label={`Brands (${brands.length})`} onClick={() => handleViewChange('brands')} isActive={currentView === 'brands'} /></li>
          <li><NavLink label={`Sidvin Team (${sidvinTeamMembers.length})`} onClick={() => handleViewChange('sidvinTeam')} isActive={currentView === 'sidvinTeam'} /></li>
          <li className="text-amber-100 font-semibold mt-6 mb-2 px-3 text-sm uppercase tracking-wider">Transactional Data</li>
          <li><NavLink label={`All Visits (${visits.length})`} onClick={() => handleViewChange('visits')} isActive={currentView === 'visits'} /></li>
          <li><NavLink label={`All Terms (${termSheetAgreements.length})`} onClick={() => handleViewChange('termSheets')} isActive={currentView === 'termSheets'} /></li>
        </ul>
      </nav>

      <div className="flex-grow flex flex-col min-h-screen">
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 pb-3">
            <div className="flex items-end gap-3">
              <div className="w-72">
              <SelectInput id="activeUser" label="Acting As" value={activeUser?.id || ''} onChange={(e) => setActiveUserId(e.target.value)} options={sidvinTeamMembers.map(member => ({ value: member.id, label: `${member.name} (${member.role})` }))} placeholder="Select Team Member" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-gray-300 bg-[#ece8e3] text-gray-800"
                aria-label="Open menu"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <img src="https://i.ibb.co/xtfh8687/Main-Logo-qp4bsy1t5svtei9fiwtef930op1p97z2fmjj9swme0.png" alt="Sidvin Logo" className="h-12 w-auto object-contain" />
            </div>
          </div>
          {isInitialLoading ? (
            <div className="min-h-[50vh] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
                <p className="text-sm text-gray-600">Connecting to Google Sheet...</p>
              </div>
            </div>
          ) : (
            renderContent()
          )}
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

const NavLink: React.FC<NavLinkProps> = ({ label, onClick, isActive, isSubItem = false }) => (
  <button type="button" onClick={onClick} className={`w-full text-left py-2 px-3 rounded-md transition duration-150 ease-in-out ${isActive ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-amber-700 hover:text-white'} ${isSubItem ? 'ml-4 text-sm' : 'font-medium'}`}>{label}</button>
);

export default App;
