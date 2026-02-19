import React from 'react';
import { Proposal, Property, Brand, Visit, TermSheetAgreement, ContactPerson, FollowUp } from '../../types';
import StageBadge from '../common/StageBadge';
import Button from '../common/Button';
import VisitsTable from '../tables/VisitsTable';
import FollowUpsTable from '../tables/FollowUpsTable'; // New import
import TermSheetAgreementsTable from '../tables/TermSheetAgreementsTable';

interface ProposalDetailViewProps {
  proposal: Proposal;
  property: Property | undefined;
  brand: Brand | undefined;
  visits: Visit[];
  followUps: FollowUp[]; // New prop for follow-ups
  termSheetAgreement: TermSheetAgreement | undefined;
  onBack: () => void;
  onEditProposal: (proposal: Proposal) => void;
  onScheduleVisit: (proposalId: string) => void;
  onEditVisit: (visit: Visit) => void;
  onDeleteVisit: (visitId: string) => void; // New prop for deleting visits
  onAddFollowUp: (proposalId: string) => void; // New prop for adding follow-up
  onEditFollowUp: (followUp: FollowUp) => void; // New prop for editing follow-up
  onDeleteFollowUp: (followUpId: string) => void; // New prop for deleting follow-up
  onAddOrEditTermSheetDetails: (proposalId: string, currentTermSheet?: TermSheetAgreement) => void;
  onRecordAgreementDates: (proposalId: string, currentTermSheet?: TermSheetAgreement) => void;
  onRecordStoreOpeningDate: (proposalId: string, currentTermSheet?: TermSheetAgreement) => void;
  onDeleteTermSheet: (proposalId: string) => void; // New prop for deleting term sheet
}

const ContactList: React.FC<{ contacts: ContactPerson[] }> = ({ contacts }) => {
  if (contacts.length === 0) return <p className="text-gray-900">N/A</p>;
  return (
    <ul className="list-disc list-inside space-y-1">
      {contacts.map(contact => (
        <li key={contact.id}>
          {contact.name} ({contact.designation}) - {contact.mobile}, {contact.email}
        </li>
      ))}
    </ul>
  );
};

const PropertyFacilitiesList: React.FC<{ termSheet?: TermSheetAgreement }> = ({ termSheet }) => {
  if (!termSheet || (
    !termSheet.ac && !termSheet.fireFightingSystem && !termSheet.flooring &&
    !termSheet.lift && !termSheet.internalWalls && !termSheet.toilets &&
    !termSheet.storeFront && !termSheet.glassFacadeGlazing && !termSheet.electricalPanel &&
    !termSheet.powerLoad && !termSheet.dgBackup
  )) {
    return <p className="text-gray-900">No facility details provided.</p>;
  }
  return (
    <ul className="list-disc list-inside space-y-1 text-sm">
      <li><strong>AC:</strong> {termSheet.ac || 'N/A'}</li>
      <li><strong>Fire Fighting:</strong> {termSheet.fireFightingSystem || 'N/A'}</li>
      <li><strong>Flooring:</strong> {termSheet.flooring || 'N/A'}</li>
      <li><strong>Lift:</strong> {termSheet.lift || 'N/A'}</li>
      <li><strong>Internal Walls:</strong> {termSheet.internalWalls || 'N/A'}</li>
      <li><strong>Toilets:</strong> {termSheet.toilets || 'N/A'}</li>
      <li><strong>Store Front:</strong> {termSheet.storeFront || 'N/A'}</li>
      <li><strong>Glass Façade / Glazing:</strong> {termSheet.glassFacadeGlazing || 'N/A'}</li>
      <li><strong>Electrical Panel:</strong> {termSheet.electricalPanel || 'N/A'}</li>
      <li><strong>Power Load:</strong> {termSheet.powerLoad || 'N/A'}</li>
      <li><strong>DG Backup:</strong> {termSheet.dgBackup || 'N/A'}</li>
    </ul>
  );
};


const ProposalDetailView: React.FC<ProposalDetailViewProps> = ({
  proposal,
  property,
  brand,
  visits,
  followUps, // Destructure new prop
  termSheetAgreement,
  onBack,
  onEditProposal,
  onScheduleVisit,
  onEditVisit,
  onDeleteVisit, // Destructure new prop
  onAddFollowUp, // Destructure new prop
  onEditFollowUp, // Destructure new prop
  onDeleteFollowUp, // Destructure new prop
  onAddOrEditTermSheetDetails,
  onRecordAgreementDates,
  onRecordStoreOpeningDate,
  onDeleteTermSheet, // Destructure new prop
}) => {
  if (!proposal) {
    return <div className="text-center py-8">Proposal not found.</div>;
  }

  const hasTermSheet = !!termSheetAgreement;
  const headerTitle = `${brand?.name || 'N/A Brand'} (${property?.address || 'N/A Property'})`;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900" aria-label={`Proposal for ${brand?.name} at ${property?.address}`}>
          {headerTitle}
        </h1>
        <Button variant="secondary" onClick={onBack}>
          Back to Proposals
        </Button>
      </div>

      {/* Proposal Summary */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-wrap justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Summary</h2>
          <Button variant="secondary" size="sm" onClick={() => onEditProposal(proposal)}>
            Edit Proposal
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Property Address:</p>
            <p className="text-gray-900">{property?.address || 'N/A'}</p>
            {property?.googleMapsLink && (
              <a href={property.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs">
                View on Map
              </a>
            )}
            <p className="font-medium text-gray-700 mt-2">Property Password:</p>
            <p className="text-gray-900">{property?.password ? '********' : 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Property Contacts:</p>
            <ContactList contacts={property?.contactPersons || []} />
          </div>
          <div>
            <p className="font-medium text-gray-700">Brand Name:</p>
            <p className="text-gray-900">{brand?.name || 'N/A'}</p>
            {brand?.logoUrl && (
              <img src={brand.logoUrl} alt={`${brand.name} Logo`} className="h-8 w-auto mt-1 object-contain" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-700">Brand Contacts:</p>
            <ContactList contacts={brand?.contactPersons || []} />
          </div>
          <div>
            <p className="font-medium text-gray-700">Proposed Rent:</p>
            <p className="text-gray-900">{property?.proposedRent !== null ? `${property?.proposedRent.toLocaleString()}` : 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Proposed Area:</p>
            <p className="text-gray-900">{property?.proposedArea !== null ? `${property?.proposedArea} sqft` : 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Service Fee Proposed:</p>
            <p className="text-gray-900">{property?.serviceFeeProposed || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Notes:</p>
            <p className="text-gray-900 break-words">{property?.notes || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Service Fee Agreed:</p>
            <p className="text-gray-900">{brand?.serviceFeeAgreed || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Assigned Rep:</p>
            <p className="text-gray-900">{brand?.assignedRep || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Proposal Date:</p>
            <p className="text-gray-900">{proposal.proposalDate || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Current Stage:</p>
            <StageBadge stage={proposal.currentStage} className="mt-1" />
          </div>
          <div>
            <p className="font-medium text-gray-700">Rate Finalized:</p>
            <p className="text-gray-900">{proposal.rateFinalized ? 'Yes' : 'No'}</p>
          </div>
          {/* Removed Next Follow Up Date */}
          <div className="lg:col-span-3">
            <p className="font-medium text-gray-700">Brand Remarks:</p>
            <p className="text-gray-900 break-words">{proposal.brandRemarks || 'N/A'}</p>
          </div>
          <div className="lg:col-span-3">
            <p className="font-medium text-gray-700">Specific Details Required by Brand:</p>
            <p className="text-gray-900 break-words">{proposal.specificDetailsRequiredByBrand || 'N/A'}</p>
          </div>
          <div className="lg:col-span-3">
            <p className="font-medium text-gray-700">Details Sent Status:</p>
            <p className="text-gray-900">{proposal.detailsSentStatus ? 'Sent' : 'Pending'}</p>
          </div>
        </div>
      </div>

      {/* Follow-ups Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Follow-ups</h2>
          <Button onClick={() => onAddFollowUp(proposal.id)}>Add New Follow Up</Button>
        </div>
        {followUps.length > 0 ? (
          <FollowUpsTable followUps={followUps} onEdit={onEditFollowUp} onDelete={onDeleteFollowUp} />
        ) : (
          <p className="text-gray-600">No follow-ups recorded for this proposal.</p>
        )}
      </div>


      {/* Visits Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Site Visits</h2>
          <Button onClick={() => onScheduleVisit(proposal.id)}>Schedule New Visit</Button>
        </div>
        {visits.length > 0 ? (
          <VisitsTable visits={visits} onEdit={onEditVisit} onDelete={onDeleteVisit} />
        ) : (
          <p className="text-gray-600">No visits recorded for this proposal.</p>
        )}
      </div>

      {/* Term Sheet & Agreement Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Term Sheet & Agreement</h2>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAddOrEditTermSheetDetails(proposal.id, termSheetAgreement)}>
              {hasTermSheet ? 'Edit Details' : 'Add Term Sheet'}
            </Button>
            {hasTermSheet && (
              <>
                <Button size="sm" variant="secondary" onClick={() => onRecordAgreementDates(proposal.id, termSheetAgreement)}>
                  Record Agreement Dates
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onRecordStoreOpeningDate(proposal.id, termSheetAgreement)}>
                  Record Store Opening
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDeleteTermSheet(proposal.id)}>
                  Delete Term Sheet
                </Button>
              </>
            )}
          </div>
        </div>
        {hasTermSheet ? (
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <p className="font-medium text-gray-700">LOI/Term Sheet Date:</p>
                <p className="text-gray-900">{termSheetAgreement.loiTermSheetDate || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Agreement Date:</p>
                <p className="text-gray-900">{termSheetAgreement.agreementDate || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Agreement Reg. Date:</p>
                <p className="text-gray-900">{termSheetAgreement.agreementRegistrationDate || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Store Opening Date:</p>
                <p className="text-gray-900">{termSheetAgreement.storeOpeningDate || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Planned Opening Date:</p>
                <p className="text-gray-900">{termSheetAgreement.plannedOpeningDate || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Handover Date:</p>
                <p className="text-gray-900">{termSheetAgreement.handoverDate || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Rent Free Period (Days):</p>
                <p className="text-gray-900">{termSheetAgreement.rentFreePeriodDays !== null ? termSheetAgreement.rentFreePeriodDays : 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Rent Commencement Date:</p>
                <p className="text-gray-900">{termSheetAgreement.rentCommencementDate || 'N/A'}</p>
              </div>
              <div className="lg:col-span-3">
                <p className="font-medium text-gray-700">Specific Terms:</p>
                <p className="text-gray-900 break-words">{termSheetAgreement.specificTerms || 'N/A'}</p>
              </div>
              <div className="lg:col-span-3">
                <p className="font-medium text-gray-700">Advance Plan:</p>
                <p className="text-gray-900 break-words">{termSheetAgreement.advancePlan || 'N/A'}</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Property Facilities</h3>
            <PropertyFacilitiesList termSheet={termSheetAgreement} />
          </div>
        ) : (
          <p className="text-gray-600">No term sheet or agreement details recorded.</p>
        )}
      </div>
    </div>
  );
};

export default ProposalDetailView;