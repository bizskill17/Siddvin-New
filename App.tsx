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
import FollowUpsTable from './components/tables/FollowUpsTable'; // New import
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
import FollowUpForm from './components/forms/FollowUpForm'; // New import
import DeleteConfirmationModal from './components/common/DeleteConfirmationModal'; // New import

type View = 'dashboard' | 'proposals' | 'properties' | 'brands' | 'visits' | 'termSheets' | 'sidvinTeam' | 'proposalDetail' | 'addProperty' | 'editProperty' | 'addBrand' | 'editBrand' | 'addProposal' | 'editProposal' | 'scheduleVisit' | 'editVisit' | 'addTermSheetDetails' | 'editTermSheetDetails' | 'recordAgreementAndStoreOpening' | 'addTeamMember' | 'editTeamMember' | 'addFollowUp' | 'editFollowUp';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [properties, setProperties] = useState<Property[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [termSheetAgreements, setTermSheetAgreements] = useState<TermSheetAgreement[]>([]);
  const [sidvinTeamMembers, setSidvinTeamMembers] = useState<SidvinTeamMember[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]); // New state

  // State for forms/details
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editingTermSheet, setEditingTermSheet] = useState<TermSheetAgreement | null>(null);
  const [editingTeamMember, setEditingTeamMember] = useState<SidvinTeamMember | null>(null);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null); // New state

  // State for proposal stage filtering in the side menu
  const [selectedStageFilter, setSelectedStageFilter] = useState<CurrentStageEnum | 'All'>('All');

  // State for delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: string; name?: string } | null>(null);
  const [deleteCallback, setDeleteCallback] = useState<(() => void) | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);


  const fetchData = useCallback(() => {
    setProperties(dataService.getProperties());
    setBrands(dataService.getBrands());
    setVisits(dataService.getVisits());
    setTermSheetAgreements(dataService.getTermSheetAgreements());
    setSidvinTeamMembers(dataService.getSidvinTeamMembers());
    setFollowUps(dataService.getFollowUps()); // Fetch follow-ups
    // Proposals are fetched last as their stage calculation depends on visits, term sheets, and follow-ups
    setProposals(dataService.getProposals());
  }, []);

  useEffect(() => {
    dataService.initializeDemoData();
    fetchData();
  }, [fetchData]);

  // --- Handlers for Data Refresh ---
  const refreshData = () => {
    fetchData();
    // After any data change, if we're on a detail view, refresh that too
    if (currentView === 'proposalDetail' && selectedProposalId) {
      const updatedProposal = dataService.getProposalById(selectedProposalId);
      if (updatedProposal) {
        setProposals(prev => prev.map(p => p.id === updatedProposal.id ? updatedProposal : p));
      }
    }
  };

  // --- Navigation Handlers ---
  const handleViewChange = (view: View) => {
    setCurrentView(view);
    // Reset specific item states when changing main view
    setSelectedProposalId(null);
    setEditingProperty(null);
    setEditingBrand(null);
    setEditingProposal(null);
    setEditingVisit(null);
    setEditingTermSheet(null);
    setEditingTeamMember(null);
    setEditingFollowUp(null); // Reset follow-up state
  };

  const handleViewProposalDetails = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setCurrentView('proposalDetail');
  };

  // --- Form Submission Handlers ---
  const handleAddProperty = (newProperty: Omit<Property, 'id'>) => {
    dataService.addProperty(newProperty);
    refreshData();
    handleViewChange('properties');
  };

  const handleUpdateProperty = (updatedProperty: Property) => {
    dataService.updateProperty(updatedProperty);
    refreshData();
    handleViewChange('properties');
  };

  const handleAddBrand = (newBrand: Omit<Brand, 'id'>) => {
    dataService.addBrand(newBrand);
    refreshData();
    handleViewChange('brands');
  };

  const handleUpdateBrand = (updatedBrand: Brand) => {
    dataService.updateBrand(updatedBrand);
    refreshData();
    handleViewChange('brands');
  };

  const handleAddProposal = (newProposal: Omit<Proposal, 'id' | 'currentStage'>) => {
    dataService.addProposal(newProposal);
    refreshData();
    handleViewChange('proposals');
  };

  const handleUpdateProposal = (updatedProposal: Proposal) => {
    dataService.updateProposal(updatedProposal);
    refreshData();
    handleViewChange('proposals');
  };

  const handleScheduleVisit = (newVisitData: Omit<Visit, 'id' | 'visitDate' | 'visitOutcome' | 'developerAttendees' | 'brandAttendees' | 'sidvinAttendees'>) => {
    const newVisit: Omit<Visit, 'id'> = {
      ...newVisitData,
      // Ensure these are null/empty for a new scheduled visit
      visitDate: null,
      visitOutcome: '',
      developerAttendees: '',
      brandAttendees: '',
      sidvinAttendees: '',
    };
    dataService.addVisit(newVisit);
    refreshData();
    handleViewChange('proposalDetail'); // Stay on detail view
  };

  const handleUpdateVisit = (updatedVisit: Visit) => {
    dataService.updateVisit(updatedVisit);
    refreshData();
    handleViewChange('proposalDetail'); // Stay on detail view
  };

  const handleAddFollowUp = (newFollowUp: Omit<FollowUp, 'id'>, actionToTake?: 'scheduleVisit') => {
    dataService.addFollowUp(newFollowUp);
    refreshData();
    if (actionToTake === 'scheduleVisit') {
      // If user chose to schedule a visit, transition to schedule visit form
      setSelectedProposalId(newFollowUp.proposalId);
      setCurrentView('scheduleVisit');
    } else {
      handleViewChange('proposalDetail'); // Stay on detail view
    }
  };

  const handleUpdateFollowUp = (updatedFollowUp: FollowUp, actionToTake?: 'scheduleVisit') => {
    dataService.updateFollowUp(updatedFollowUp);
    refreshData();
    if (actionToTake === 'scheduleVisit') {
      setSelectedProposalId(updatedFollowUp.proposalId);
      setCurrentView('scheduleVisit');
    } else {
      handleViewChange('proposalDetail');
    }
  };


  const handleAddOrUpdateTermSheetDetails = (termSheetData: Omit<TermSheetAgreement, 'agreementDate' | 'agreementRegistrationDate' | 'storeOpeningDate'>) => {
    // When updating general details, we need to merge with existing agreement/store dates if they exist
    const existingTermSheet = dataService.getTermSheetByProposalId(termSheetData.proposalId);
    const fullTermSheet: TermSheetAgreement = {
      ...termSheetData,
      agreementDate: existingTermSheet?.agreementDate || null,
      agreementRegistrationDate: existingTermSheet?.agreementRegistrationDate || null,
      storeOpeningDate: existingTermSheet?.storeOpeningDate || null,
    };
    dataService.addOrUpdateTermSheet(fullTermSheet);
    refreshData();
    handleViewChange('proposalDetail');
  };

  const handleRecordAgreementDates = (
    proposalId: string,
    agreementDate: string | null,
    agreementRegistrationDate: string | null
  ) => {
    dataService.updateAgreementDates(proposalId, agreementDate, agreementRegistrationDate);
    refreshData();
    handleViewChange('proposalDetail');
  };

  const handleRecordAgreementAndStoreOpeningDates = (
    proposalId: string,
    agreementDate: string | null,
    agreementRegistrationDate: string | null,
    storeOpeningDate: string | null
  ) => {
    dataService.updateAgreementDates(proposalId, agreementDate, agreementRegistrationDate);
    dataService.updateStoreOpeningDate(proposalId, storeOpeningDate);
    refreshData();
    handleViewChange('proposalDetail');
  };

  const handleAddTeamMember = (newMember: Omit<SidvinTeamMember, 'id'>) => {
    dataService.addSidvinTeamMember(newMember);
    refreshData();
    handleViewChange('sidvinTeam');
  };

  const handleUpdateTeamMember = (updatedMember: SidvinTeamMember) => {
    dataService.updateSidvinTeamMember(updatedMember);
    refreshData();
    handleViewChange('sidvinTeam');
  };

  const handleUpdateInvoiceStatus = (proposalId: string, invoiceStatus: boolean) => {
    dataService.updateProposalInvoiceStatus(proposalId, invoiceStatus);
    refreshData();
  };

  // --- Form Cancel Handlers ---
  const handleCancelForm = () => {
    setEditingProperty(null);
    setEditingBrand(null);
    setEditingProposal(null);
    setEditingVisit(null);
    setEditingTermSheet(null);
    setEditingTeamMember(null);
    setEditingFollowUp(null);

    // Navigate back to the appropriate list or detail view
    if (selectedProposalId) {
      setCurrentView('proposalDetail');
    } else {
      // Determine what was being edited/added
      if (currentView.includes('Property')) setCurrentView('properties');
      else if (currentView.includes('Brand')) setCurrentView('brands');
      else if (currentView.includes('Proposal')) setCurrentView('proposals');
      else if (currentView.includes('TeamMember')) setCurrentView('sidvinTeam');
      else if (currentView.includes('Visit')) setCurrentView('visits');
      else if (currentView.includes('TermSheet')) setCurrentView('termSheets');
      else if (currentView.includes('FollowUp')) setCurrentView('proposals'); // Follow-ups often managed from proposal detail
    }
  };

  // Determine if a proposal has any completed visits for the 'Rate Finalized' logic
  const checkHasCompletedVisits = (propId: string | undefined): boolean => {
    if (!propId) return false;
    const relatedVisits = visits.filter(v => v.proposalId === propId);
    return relatedVisits.some(v => v.visitDate !== null && v.visitDate !== '');
  };

  // --- Delete Handlers ---
  const handleDeleteClick = (id: string, type: string, name?: string) => {
    setItemToDelete({ id, type, name });
    setDeleteError(null); // Clear previous errors
    setShowDeleteConfirm(true);
    setDeleteCallback(() => async () => {
      try {
        let success = false;
        switch (type) {
          case 'property':
            success = dataService.deleteProperty(id);
            break;
          case 'brand':
            success = dataService.deleteBrand(id);
            break;
          case 'proposal':
            success = dataService.deleteProposal(id); // Handles cascade
            break;
          case 'visit':
            success = dataService.deleteVisit(id);
            break;
          case 'followUp':
            success = dataService.deleteFollowUp(id);
            break;
          case 'termSheet':
            success = dataService.deleteTermSheet(id); // Uses proposalId
            break;
          case 'teamMember':
            success = dataService.deleteSidvinTeamMember(id);
            break;
          default:
            throw new Error('Unknown item type for deletion.');
        }
        if (success) {
          refreshData();
          setShowDeleteConfirm(false);
          // After deleting a proposal, go back to the proposals list
          if (type === 'proposal' && selectedProposalId === id) {
            handleViewChange('proposals');
          } else if (type === 'termSheet' && selectedProposalId === id) {
            // If term sheet deleted from detail, stay on detail view but refresh
            refreshData();
          }
        } else {
          setDeleteError(`Failed to delete ${type}.`);
        }
      } catch (error: any) {
        setDeleteError(error.message || `An error occurred while deleting ${type}.`);
      }
    });
  };

  const handleConfirmDelete = () => {
    if (deleteCallback) {
      deleteCallback();
    }
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    setDeleteCallback(null);
    setDeleteError(null);
  };


  // --- Render Logic ---
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            proposals={proposals}
            visits={visits}
            properties={properties}
            brands={brands}
            onStageClick={(stage) => {
              setSelectedStageFilter(stage);
              handleViewChange('proposals');
            }}
          />
        );
      case 'properties':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Properties Master Data</h1>
              <Button onClick={() => handleViewChange('addProperty')}>Add New Property</Button>
            </div>
            <PropertiesTable properties={properties} onEdit={(p) => { setEditingProperty(p); setCurrentView('editProperty'); }} onDelete={(id) => handleDeleteClick(id, 'property')} />
          </>
        );
      case 'addProperty':
        return <PropertyForm onSubmit={handleAddProperty} onCancel={handleCancelForm} />;
      case 'editProperty':
        return editingProperty ? (
          <PropertyForm initialData={editingProperty} onSubmit={handleUpdateProperty} onCancel={handleCancelForm} />
        ) : (
          <div className="text-center py-8">Property not found for editing.</div>
        );

      case 'brands':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Brands Master Data</h1>
              <Button onClick={() => handleViewChange('addBrand')}>Add New Brand</Button>
            </div>
            <BrandsTable brands={brands} onEdit={(b) => { setEditingBrand(b); setCurrentView('editBrand'); }} onDelete={(id) => handleDeleteClick(id, 'brand')} />
          </>
        );
      case 'addBrand':
        return <BrandForm sidvinTeamMembers={sidvinTeamMembers} onSubmit={handleAddBrand} onCancel={handleCancelForm} />;
      case 'editBrand':
        return editingBrand ? (
          <BrandForm initialData={editingBrand} sidvinTeamMembers={sidvinTeamMembers} onSubmit={handleUpdateBrand} onCancel={handleCancelForm} />
        ) : (
          <div className="text-center py-8">Brand not found for editing.</div>
        );

      case 'sidvinTeam':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Sidvin Team Members</h1>
              <Button onClick={() => handleViewChange('addTeamMember')}>Add New Team Member</Button>
            </div>
            <SidvinTeamTable teamMembers={sidvinTeamMembers} onEdit={(m) => { setEditingTeamMember(m); setCurrentView('editTeamMember'); }} onDelete={(id) => handleDeleteClick(id, 'teamMember')} />
          </>
        );
      case 'addTeamMember':
        return <SidvinTeamForm onSubmit={handleAddTeamMember} onCancel={handleCancelForm} />;
      case 'editTeamMember':
        return editingTeamMember ? (
          <SidvinTeamForm initialData={editingTeamMember} onSubmit={handleUpdateTeamMember} onCancel={handleCancelForm} />
        ) : (
          <div className="text-center py-8">Team Member not found for editing.</div>
        );

      case 'visits':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">All Site Visits</h1>
            </div>
            <VisitsTable visits={visits} onEdit={(v) => { setEditingVisit(v); setCurrentView('editVisit'); }} onDelete={(id) => handleDeleteClick(id, 'visit')} />
          </>
        );
      case 'editVisit':
        return editingVisit ? (
          <EditVisitForm proposalId={editingVisit.proposalId} initialData={editingVisit} sidvinTeamMembers={sidvinTeamMembers} onSubmit={handleUpdateVisit} onCancel={handleCancelForm} />
        ) : (
          <div className="text-center py-8">Visit not found for editing.</div>
        );
      case 'scheduleVisit':
        return selectedProposalId ? (
          <ScheduleVisitForm proposalId={selectedProposalId} onSubmit={handleScheduleVisit} onCancel={handleCancelForm} />
        ) : (
          <div className="text-center py-8">No proposal selected to schedule visit.</div>
        );

      case 'termSheets':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">All Term Sheets & Agreements</h1>
            </div>
            <TermSheetAgreementsTable termSheets={termSheetAgreements} onEdit={(ts) => { setEditingTermSheet(ts); setCurrentView('editTermSheetDetails'); }} onDelete={(id) => handleDeleteClick(id, 'termSheet')} />
          </>
        );
      case 'addTermSheetDetails':
      case 'editTermSheetDetails':
        return selectedProposalId ? (
          <TermSheetAgreementForm
            proposalId={selectedProposalId}
            initialData={editingTermSheet || (termSheetAgreements.find(ts => ts.proposalId === selectedProposalId) || undefined)}
            onSubmit={handleAddOrUpdateTermSheetDetails}
            onCancel={handleCancelForm}
          />
        ) : (
          <div className="text-center py-8">No proposal selected for term sheet details.</div>
        );
      case 'recordAgreementAndStoreOpening':
        return selectedProposalId ? (
          <RecordAgreementAndStoreOpeningForm
            proposalId={selectedProposalId}
            initialData={termSheetAgreements.find(ts => ts.proposalId === selectedProposalId)}
            onSubmit={handleRecordAgreementAndStoreOpeningDates}
            onCancel={handleCancelForm}
          />
        ) : (
          <div className="text-center py-8">No proposal selected to record agreement and store opening dates.</div>
        );

      case 'addFollowUp':
        return selectedProposalId ? (
          <FollowUpForm proposalId={selectedProposalId} onSubmit={handleAddFollowUp} onCancel={handleCancelForm} />
        ) : (
          <div className="text-center py-8">No proposal selected to add follow-up.</div>
        );
      case 'editFollowUp':
        return editingFollowUp ? (
          <FollowUpForm proposalId={editingFollowUp.proposalId} initialData={editingFollowUp} onSubmit={handleUpdateFollowUp} onCancel={handleCancelForm} />
        ) : (
          <div className="text-center py-8">Follow-up not found for editing.</div>
        );


      case 'proposals':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Proposal Workflow</h1>
              <Button onClick={() => handleViewChange('addProposal')}>Create New Proposal</Button>
            </div>
            <ProposalsTable
              proposals={proposals}
              properties={properties}
              brands={brands}
              followUps={followUps}
              onViewDetails={handleViewProposalDetails}
              onEdit={(p) => { setEditingProposal(p); setCurrentView('editProposal'); }}
              onDelete={(id) => handleDeleteClick(id, 'proposal')}
              selectedStage={selectedStageFilter}
            />
          </>
        );
      case 'addProposal':
        return (
          <ProposalForm
            properties={properties}
            brands={brands}
            sidvinTeamMembers={sidvinTeamMembers}
            hasCompletedVisits={false}
            onSubmit={handleAddProposal}
            onCancel={handleCancelForm}
          />
        );
      case 'editProposal':
        const proposalForEdit = editingProposal || proposals.find(p => p.id === selectedProposalId);
        const hasCompletedVisitsForEdit = checkHasCompletedVisits(proposalForEdit?.id);
        return proposalForEdit ? (
          <ProposalForm
            initialData={proposalForEdit}
            properties={properties}
            brands={brands}
            sidvinTeamMembers={sidvinTeamMembers}
            hasCompletedVisits={hasCompletedVisitsForEdit}
            onSubmit={handleUpdateProposal}
            onCancel={handleCancelForm}
          />
        ) : (
          <div className="text-center py-8">Proposal not found for editing.</div>
        );


      case 'proposalDetail':
        const proposal = proposals.find(p => p.id === selectedProposalId);
        const propertyForProposal = properties.find(p => p.id === proposal?.propertyId);
        const brandForProposal = brands.find(b => b.id === proposal?.brandId);
        const visitsForProposal = visits.filter(v => v.proposalId === selectedProposalId);
        const followUpsForProposal = followUps.filter(fu => fu.proposalId === selectedProposalId); // Filter follow-ups
        const termSheetForProposal = termSheetAgreements.find(ts => ts.proposalId === selectedProposalId);

        return proposal ? (
          <ProposalDetailView
            proposal={proposal}
            property={propertyForProposal}
            brand={brandForProposal}
            visits={visitsForProposal}
            followUps={followUpsForProposal} // Pass follow-ups
            termSheetAgreement={termSheetForProposal}
            onBack={() => handleViewChange('proposals')}
            onEditProposal={(p) => { setEditingProposal(p); setCurrentView('editProposal'); }}
            onScheduleVisit={(pId) => { setSelectedProposalId(pId); setCurrentView('scheduleVisit'); }}
            onEditVisit={(v) => { setEditingVisit(v); setCurrentView('editVisit'); }}
            onDeleteVisit={(id) => handleDeleteClick(id, 'visit')}
            onAddFollowUp={(pId) => { setSelectedProposalId(pId); setCurrentView('addFollowUp'); }}
            onEditFollowUp={(fu) => { setEditingFollowUp(fu); setCurrentView('editFollowUp'); }}
            onDeleteFollowUp={(id) => handleDeleteClick(id, 'followUp')}
            onAddOrEditTermSheetDetails={(pId, currentTs) => {
              setSelectedProposalId(pId);
              setEditingTermSheet(currentTs || null);
              setCurrentView('addTermSheetDetails');
            }}
            onRecordAgreementDates={(pId, currentTs) => {
              setSelectedProposalId(pId);
              setEditingTermSheet(currentTs || null);
              setCurrentView('recordAgreementAndStoreOpening');
            }}
            onDeleteTermSheet={(id) => handleDeleteClick(id, 'termSheet')}
            onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
          />
        ) : (
          <div className="text-center py-8">Proposal details not found.</div>
        );

      default:
        return <div className="text-center py-8">Select a view from the navigation.</div>;
    }
  };

  const allProposalStages = Object.values(CurrentStageEnum);

  return (
    <div className="min-h-screen flex">
      {/* Side Navigation */}
      <nav className="w-64 bg-gradient-to-b from-amber-800 to-amber-800 text-white p-4 shadow-lg flex-shrink-0 relative z-20">
        <div className="mb-4 px-3">
          <h1 className="text-xl font-extrabold tracking-wide">Proposal Management</h1>
        </div>
        <ul className="space-y-1">
          <li>
            <NavLink
              view="dashboard"
              currentView={currentView}
              label="Dashboard"
              onClick={() => handleViewChange('dashboard')}
              isActive={currentView === 'dashboard'}
            />
          </li>
          <li>
            <NavLink
              view="proposals"
              currentView={currentView}
              label="All Proposals"
              onClick={() => { handleViewChange('proposals'); setSelectedStageFilter('All'); }}
              isActive={currentView === 'proposals' && selectedStageFilter === 'All'}
            />
          </li>
          <li className="text-amber-100 font-semibold mt-4 mb-2 px-3 text-sm uppercase tracking-wider">Proposal Stages</li>
          {allProposalStages.map(stage => (
            <li key={stage}>
              <NavLink
                view="proposals"
                currentView={currentView}
                label={stage}
                onClick={() => { handleViewChange('proposals'); setSelectedStageFilter(stage); }}
                isActive={currentView === 'proposals' && selectedStageFilter === stage}
                isSubItem={true}
              />
            </li>
          ))}
          <li className="text-amber-100 font-semibold mt-6 mb-2 px-3 text-sm uppercase tracking-wider">Master Data</li>
          <li>
            <NavLink
              view="properties"
              currentView={currentView}
              label="Properties"
              onClick={() => handleViewChange('properties')}
              isActive={currentView === 'properties'}
            />
          </li>
          <li>
            <NavLink
              view="brands"
              currentView={currentView}
              label="Brands"
              onClick={() => handleViewChange('brands')}
              isActive={currentView === 'brands'}
            />
          </li>
          <li>
            <NavLink
              view="sidvinTeam"
              currentView={currentView}
              label="Sidvin Team"
              onClick={() => handleViewChange('sidvinTeam')}
              isActive={currentView === 'sidvinTeam'}
            />
          </li>
          <li className="text-amber-100 font-semibold mt-6 mb-2 px-3 text-sm uppercase tracking-wider">Transactional Data</li>
          <li>
            <NavLink
              view="visits"
              currentView={currentView}
              label="All Visits"
              onClick={() => handleViewChange('visits')}
              isActive={currentView === 'visits'}
            />
          </li>
          <li>
            <NavLink
              view="termSheets"
              currentView={currentView}
              label="All Term Sheets"
              onClick={() => handleViewChange('termSheets')}
              isActive={currentView === 'termSheets'}
            />
          </li>
        </ul>
      </nav>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-h-screen">
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="mb-6 flex items-center justify-end border-b border-gray-300 pb-3">
            <img
              src="https://i.ibb.co/xtfh8687/Main-Logo-qp4bsy1t5svtei9fiwtef930op1p97z2fmjj9swme0.png"
              alt="Sidvin Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          {renderContent()}
        </main>
      </div>
      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title={`Delete ${itemToDelete?.type}?`}
        message={`Are you sure you want to delete ${itemToDelete?.name || itemToDelete?.type} (ID: ${itemToDelete?.id.substring(0, 8)}...)? This action cannot be undone.`}
        error={deleteError}
      />
    </div>
  );
};

// Helper component for navigation links
interface NavLinkProps {
  view: View;
  currentView: View;
  label: string;
  onClick: () => void;
  isActive: boolean;
  isSubItem?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ label, onClick, isActive, isSubItem = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left py-2 px-3 rounded-md transition duration-150 ease-in-out
        ${isActive ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-amber-700 hover:text-white'}
        ${isSubItem ? 'ml-4 text-sm' : 'font-medium'}
      `}
    >
      {label}
    </button>
  );
};

export default App;




