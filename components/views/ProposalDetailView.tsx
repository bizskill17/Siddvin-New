import React from 'react';
import { Proposal, Property, Brand, Visit, TermSheetAgreement, ContactPerson, FollowUp, CurrentStageEnum, DepositStage } from '../../types';
import StageBadge from '../common/StageBadge';
import Button from '../common/Button';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import VisitsTable from '../tables/VisitsTable';
import FollowUpsTable from '../tables/FollowUpsTable';
import { formatDateDisplay, formatDateTimeDisplay } from '../common/dateUtils';
import { downloadElementAsPdf } from '../common/exportUtils';

interface ProposalDetailViewProps {
  proposal: Proposal;
  property: Property | undefined;
  brand: Brand | undefined;
  visits: Visit[];
  followUps: FollowUp[];
  termSheetAgreement: TermSheetAgreement | undefined;
  onBack: () => void;
  onEditProposal: (proposal: Proposal) => void;
  onScheduleVisit: (proposalId: string) => void;
  onEditVisit: (visit: Visit) => void;
  onDeleteVisit: (visitId: string) => void;
  onAddFollowUp: (proposalId: string) => void;
  onEditFollowUp: (followUp: FollowUp) => void;
  onDeleteFollowUp: (followUpId: string) => void;
  onAddOrEditTermSheetDetails: (proposalId: string, currentTermSheet?: TermSheetAgreement) => void;
  onRecordAgreementDates: (proposalId: string, currentTermSheet?: TermSheetAgreement) => void;
  onDeleteTermSheet: (proposalId: string) => void;
  onDeleteReceipt: (termSheet: TermSheetAgreement, depositStageId: string, receiptId: string) => void;
}

interface ReceiptRow {
  id: string;
  stageId: string;
  stageName: string;
  receiptDate: string | null;
  receiptAmount: number;
}

const getStageReceiptEntries = (stage: DepositStage): ReceiptRow[] => {
  if (stage.receipts && stage.receipts.length > 0) {
    return stage.receipts.map((receipt) => ({
      id: receipt.id,
      stageId: stage.id,
      stageName: stage.stageName,
      receiptDate: receipt.receiptDate,
      receiptAmount: receipt.receiptAmount,
    }));
  }

  const fallbackAmount = stage.receivedAmount ?? (stage.received ? (stage.amount ?? 0) : 0);
  if (fallbackAmount > 0) {
    return [{
      id: `legacy-${stage.id}`,
      stageId: stage.id,
      stageName: stage.stageName,
      receiptDate: stage.receiptDate ?? null,
      receiptAmount: fallbackAmount,
    }];
  }

  return [];
};

const ContactList: React.FC<{ contacts: ContactPerson[] }> = ({ contacts }) => {
  if (contacts.length === 0) return <p className="text-gray-900">N/A</p>;
  return (
    <ul className="list-disc list-inside space-y-1">
      {contacts.map(contact => (
        <li key={contact.id}>{contact.name} ({contact.designation}) - {contact.mobile}, {contact.email}</li>
      ))}
    </ul>
  );
};

const ProposalDetailView: React.FC<ProposalDetailViewProps> = ({
  proposal,
  property,
  brand,
  visits,
  followUps,
  termSheetAgreement,
  onBack,
  onEditProposal,
  onScheduleVisit,
  onEditVisit,
  onDeleteVisit,
  onAddFollowUp,
  onEditFollowUp,
  onDeleteFollowUp,
  onAddOrEditTermSheetDetails,
  onRecordAgreementDates,
  onDeleteTermSheet,
  onDeleteReceipt,
}) => {
  const hasTermSheet = !!termSheetAgreement;
  const hasScheduledVisit = visits.some(v => !!v.scheduledDate && !v.visitDate);

  const receiptRows = React.useMemo(
    () => (termSheetAgreement?.depositStages || []).flatMap((stage) => getStageReceiptEntries(stage)),
    [termSheetAgreement]
  );

  const pendingDepositInfo = React.useMemo(() => {
    if (!termSheetAgreement) return null;
    const stages = termSheetAgreement.depositStages || [];
    const totalReceived = receiptRows.reduce((sum, r) => sum + r.receiptAmount, 0);
    let runningReceived = totalReceived;
    for (const ds of stages) {
      const amt = ds.amount || 0;
      if (runningReceived >= amt && amt > 0) {
        runningReceived -= amt;
      } else {
        return { name: ds.stageName, amount: amt - runningReceived };
      }
    }
    return null;
  }, [termSheetAgreement, receiptRows]);

  const pendingDepositStage = pendingDepositInfo?.name;

  const totalDepositAmount = React.useMemo(
    () => (termSheetAgreement?.depositStages || []).reduce((sum, stage) => sum + (stage.amount || 0), 0),
    [termSheetAgreement]
  );
  const totalReceiptAmount = React.useMemo(
    () => receiptRows.reduce((sum, receipt) => sum + (receipt.receiptAmount || 0), 0),
    [receiptRows]
  );
  const [receiptToDelete, setReceiptToDelete] = React.useState<ReceiptRow | null>(null);

  return (
    <div id="proposal-detail-export" className="container mx-auto p-4 sm:p-6 lg:p-8 bg-[#ece8e3] shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{brand?.name || 'N/A Brand'} ({property?.address || 'N/A Property'})</h1>
        <div className="flex gap-2" data-export-ignore="true">
          <Button variant="secondary" onClick={() => downloadElementAsPdf('proposal-detail-export', 'Proposal View')}>Download PDF</Button>
          <Button variant="primary" onClick={onBack}>Back to Proposals</Button>
        </div>
      </div>

      <div className="mb-8 p-6 bg-[#ece8e3] rounded-lg border border-gray-200">
        <div className="flex flex-wrap justify-between items-center mb-4" data-export-ignore="true">
          <h2 className="text-xl font-semibold text-gray-800">Summary</h2>
          <Button variant="secondary" size="sm" onClick={() => onEditProposal(proposal)}>Edit Proposal</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div><p className="font-medium text-gray-700">Property Code:</p><p className="text-gray-900">{property?.serialNo ? `P-${property.serialNo}` : 'N/A'}</p></div>
          <div><p className="font-medium text-gray-700">Brand Code:</p><p className="text-gray-900">{brand?.serialNo ? `B-${brand.serialNo}` : 'N/A'}</p></div>
          <div><p className="font-medium text-gray-700">Proposal Code:</p><p className="text-gray-900">{proposal.serialNo ? `Q-${proposal.serialNo}` : 'N/A'}</p></div>

          <div><p className="font-medium text-gray-700">Property Address:</p><p className="text-gray-900">{property?.address || 'N/A'}</p></div>
          <div><p className="font-medium text-gray-700">Property Contacts:</p><ContactList contacts={property?.contactPersons || []} /></div>
          <div><p className="font-medium text-gray-700">Brand Name:</p><p className="text-gray-900">{brand?.name || 'N/A'}</p></div>
          <div><p className="font-medium text-gray-700">Brand Contacts:</p><ContactList contacts={brand?.contactPersons || []} /></div>

          <div><p className="font-medium text-gray-700">Proposal Date:</p><p className="text-gray-900">{formatDateDisplay(proposal.proposalDate)}</p></div>
          <div>
            <p className="font-medium text-gray-700">Current Stage:</p>
            <StageBadge stage={proposal.currentStage} className="mt-1" />
            {pendingDepositStage && (
              <p className="text-xs text-black mt-1">{`Pending for ${pendingDepositStage} Deposit`}</p>
            )}
          </div>

          {(proposal.currentStage === CurrentStageEnum.PendingBrandFees || proposal.currentStage === CurrentStageEnum.CompletedProposal) && (
            <>
              <div><p className="font-medium text-gray-700">Invoice No:</p><p className="text-gray-900">{proposal.invoiceNo || 'N/A'}</p></div>
              <div><p className="font-medium text-gray-700">Invoice Date:</p><p className="text-gray-900">{formatDateDisplay(proposal.invoiceDate)}</p></div>
              <div><p className="font-medium text-gray-700">Invoice Amount:</p><p className="text-gray-900">{proposal.invoiceAmount ?? 'N/A'}</p></div>
            </>
          )}

          <div className="lg:col-span-3"><p className="font-medium text-gray-700">Brand Remarks:</p><p className="text-gray-900 break-words">{proposal.brandRemarks || 'N/A'}</p></div>

          <div><p className="font-medium text-gray-700">Created:</p><p className="text-gray-900">{formatDateTimeDisplay(proposal.createdAt)}</p></div>
          <div><p className="font-medium text-gray-700">Last Updated:</p><p className="text-gray-900">{formatDateTimeDisplay(proposal.updatedAt)}</p></div>
          <div><p className="font-medium text-gray-700">Updated By:</p><p className="text-gray-900">{proposal.updatedBy || 'N/A'}</p></div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4" data-export-ignore="true">
          <h2 className="text-xl font-semibold text-gray-800">Follow-ups</h2>
          <Button onClick={() => onAddFollowUp(proposal.id)} disabled={hasScheduledVisit} title={hasScheduledVisit ? 'Cannot add follow-up while a visit is already scheduled.' : 'Add New Follow Up'}>Add New Follow Up</Button>
        </div>
        {followUps.length > 0 ? <FollowUpsTable followUps={followUps} onEdit={onEditFollowUp} onDelete={onDeleteFollowUp} /> : <p className="text-gray-600">No follow-ups recorded.</p>}
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4" data-export-ignore="true">
          <h2 className="text-xl font-semibold text-gray-800">Site Visits</h2>
          <Button onClick={() => onScheduleVisit(proposal.id)}>Schedule New Visit</Button>
        </div>
        {visits.length > 0 ? <VisitsTable visits={visits} onEdit={onEditVisit} onDelete={onDeleteVisit} /> : <p className="text-gray-600">No visits recorded.</p>}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4" data-export-ignore="true">
          <h2 className="text-xl font-semibold text-gray-800">Terms</h2>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAddOrEditTermSheetDetails(proposal.id, termSheetAgreement)}>{hasTermSheet ? 'Edit Terms' : 'Add Terms'}</Button>
            {hasTermSheet && (
              <>
                <Button size="sm" onClick={() => onRecordAgreementDates(proposal.id, termSheetAgreement)}>Record Agreement / Store Opening</Button>
                <Button size="sm" variant="danger" onClick={() => onDeleteTermSheet(proposal.id)}>Delete Terms</Button>
              </>
            )}
          </div>
        </div>
        {hasTermSheet ? (
          <div className="p-6 bg-[#ece8e3] rounded-lg border border-gray-200 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div><p className="font-medium text-gray-700">Finalization Date:</p><p className="text-gray-900">{formatDateDisplay(termSheetAgreement.finalizationDate)}</p></div>
              <div><p className="font-medium text-gray-700">Lease Agreement Prepared:</p><p className="text-gray-900">{formatDateDisplay(termSheetAgreement.preparationDate)}</p></div>
              <div><p className="font-medium text-gray-700">Lease Agreement Signed:</p><p className="text-gray-900">{formatDateDisplay(termSheetAgreement.signingDate)}</p></div>
              <div><p className="font-medium text-gray-700">Agreement Registration Required:</p><p className="text-gray-900">{termSheetAgreement.agreementRegistrationRequired ? 'Yes' : 'No'}</p></div>
              {termSheetAgreement.agreementRegistrationRequired && <div><p className="font-medium text-gray-700">Lease Agreement Registered:</p><p className="text-gray-900">{formatDateDisplay(termSheetAgreement.agreementRegistrationDate)}</p></div>}
              {termSheetAgreement.agreementRegistrationRequired && <div><p className="font-medium text-gray-700">Registration Fee Shares:</p><p className="text-gray-900">Property {termSheetAgreement.registrationFeePropertyShare ?? 'N/A'}% / Brand {termSheetAgreement.registrationFeeBrandShare ?? 'N/A'}%</p></div>}
              <div><p className="font-medium text-gray-700">Store Opening Date:</p><p className="text-gray-900">{formatDateDisplay(termSheetAgreement.storeOpeningDate)}</p></div>
              <div className="lg:col-span-3"><p className="font-medium text-gray-700">Lease Agreement Remarks:</p><p className="text-gray-900 break-words">{termSheetAgreement.leaseAgreementRemarks || 'N/A'}</p></div>
              <div className="lg:col-span-3"><p className="font-medium text-gray-700">Terms:</p><p className="text-gray-900 break-words">{termSheetAgreement.specificTerms || 'N/A'}</p></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Deposit <span className="text-base font-medium text-gray-600">(Total Deposit: {totalDepositAmount})</span>
            </h3>
            {termSheetAgreement.depositStages.length === 0 ? <p className="text-gray-600">No deposit stages.</p> : (
              <ul className="list-disc pl-5 space-y-1">
                {termSheetAgreement.depositStages.map((ds) => (
                  <li key={ds.id}>
                    {ds.stageName}: {ds.amount ?? 'N/A'}
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mt-5 text-lg font-semibold text-gray-800 mb-2">
              Receipt <span className="text-base font-medium text-gray-600">(Total Receipt: {totalReceiptAmount})</span>
            </h3>
            {receiptRows.length === 0 ? (
              <p className="text-gray-600">No receipts recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead className="bg-orange-700 text-white">
                    <tr>
                      <th className="border border-black px-3 py-2 text-left">Receipt Date</th>
                      <th className="border border-black px-3 py-2 text-left">Receipt Amount</th>
                      <th className="border border-black px-3 py-2 text-center" data-export-ignore="true">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#ece8e3]">
                    {receiptRows.map((receipt) => (
                      <tr key={receipt.id}>
                        <td className="border border-black px-3 py-2">{formatDateDisplay(receipt.receiptDate)}</td>
                        <td className="border border-black px-3 py-2">{receipt.receiptAmount}</td>
                        <td className="border border-black px-3 py-2 text-center" data-export-ignore="true">
                          <Button size="sm" variant="danger" onClick={() => setReceiptToDelete(receipt)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><p className="font-medium text-gray-700">Created:</p><p className="text-gray-900">{formatDateTimeDisplay(termSheetAgreement.createdAt)}</p></div>
              <div><p className="font-medium text-gray-700">Last Updated:</p><p className="text-gray-900">{formatDateTimeDisplay(termSheetAgreement.updatedAt)}</p></div>
              <div><p className="font-medium text-gray-700">Updated By:</p><p className="text-gray-900">{termSheetAgreement.updatedBy || 'N/A'}</p></div>
            </div>
          </div>
        ) : <p className="text-gray-600">No terms recorded.</p>}
      </div>
      {termSheetAgreement && receiptToDelete && (
        <DeleteConfirmationModal
          isOpen
          onClose={() => setReceiptToDelete(null)}
          onConfirm={() => {
            onDeleteReceipt(termSheetAgreement, receiptToDelete.stageId, receiptToDelete.id);
            setReceiptToDelete(null);
          }}
          title="Delete Receipt"
          message={`Delete the receipt for ${receiptToDelete.stageName} dated ${formatDateDisplay(receiptToDelete.receiptDate)}?`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default ProposalDetailView;



