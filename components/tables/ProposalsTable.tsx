import React from 'react';
import { Proposal, Property, Brand, CurrentStageEnum, FollowUp } from '../../types';
import Button from '../common/Button';
import StageBadge from '../common/StageBadge';
import { formatDateDisplay } from '../common/dateUtils';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface ProposalsTableProps {
  proposals: Proposal[];
  properties: Property[];
  brands: Brand[];
  followUps: FollowUp[];
  onViewDetails: (proposalId: string) => void;
  onEdit?: (proposal: Proposal) => void;
  onDelete?: (proposalId: string) => void; // New prop for delete
  selectedStage?: CurrentStageEnum | 'All'; // Keep prop for external filtering
}

const ProposalsTable: React.FC<ProposalsTableProps> = ({
  proposals,
  properties,
  brands,
  followUps,
  onViewDetails,
  onEdit,
  onDelete,
  selectedStage = 'All', // Default to 'All' if not provided
}) => {
  const getPropertyName = (propertyId: string) =>
    properties.find(p => p.id === propertyId)?.address || 'N/A'; // Display address instead of owner
  const getBrandName = (brandId: string) =>
    brands.find(b => b.id === brandId)?.name || 'N/A';

  // Filter proposals based on selectedStage passed from App.tsx (side menu)
  const filteredProposals = selectedStage === 'All'
    ? proposals
    : proposals.filter(p => p.currentStage === selectedStage);
  const [searchTerm, setSearchTerm] = React.useState('');

  const getLatestFollowUpInfo = (proposalId: string) => {
    const proposalFollowUps = followUps.filter(fu => fu.proposalId === proposalId);
    if (proposalFollowUps.length === 0) return null;

    const sortedByDateDesc = [...proposalFollowUps].sort((a, b) => {
      const aTime = new Date(a.nextFollowUpDate || a.followUpDate || '').getTime();
      const bTime = new Date(b.nextFollowUpDate || b.followUpDate || '').getTime();
      return bTime - aTime;
    });

    return sortedByDateDesc[0];
  };

  const visibleProposals = filteredProposals.filter((proposal) => {
    const text = [
      getPropertyName(proposal.propertyId),
      getBrandName(proposal.brandId),
      formatDateDisplay(proposal.proposalDate),
      proposal.currentStage,
    ].join(' ').toLowerCase();
    return text.includes(searchTerm.trim().toLowerCase());
  });

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Proposals</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search proposals..."
            className="px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              exportRowsToCsv(
                'proposals',
                ['No.', 'Property Address', 'Brand Name', 'Proposal Date', 'Current Stage'],
                visibleProposals.map((p, i) => [
                  i + 1,
                  getPropertyName(p.propertyId),
                  getBrandName(p.brandId),
                  formatDateDisplay(p.proposalDate),
                  p.currentStage,
                ])
              )
            }
          >
            Download Excel
          </Button>
          <Button size="sm" variant="secondary" onClick={() => downloadTableAsPdf('proposals-table', 'Proposals')}>
            Download PDF
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-gray-200">
        <table id="proposals-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-gray-300 [&_td]:border [&_td]:border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 border-b border-gray-300">
                No.
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
                Property Address
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
                Brand Name
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
                Proposal Date
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
                Current Stage
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 border-b border-gray-300">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
            {visibleProposals.map((proposal, index) => (
              <tr key={proposal.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                  {index + 1}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {getPropertyName(proposal.propertyId)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {getBrandName(proposal.brandId)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {formatDateDisplay(proposal.proposalDate)}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500">
                  <StageBadge stage={proposal.currentStage} />
                  {proposal.currentStage === CurrentStageEnum.PendingFollowUp && (() => {
                    const latestFollowUp = getLatestFollowUpInfo(proposal.id);
                    if (!latestFollowUp) return null;
                    return (
                      <div className="mt-1 text-xs text-gray-600">
                        <div>Next: {formatDateDisplay(latestFollowUp.nextFollowUpDate || latestFollowUp.followUpDate)}</div>
                        <div className="truncate max-w-[260px]" title={latestFollowUp.remarks || 'N/A'}>
                          Remarks: {latestFollowUp.remarks || 'N/A'}
                        </div>
                      </div>
                    );
                  })()}
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <div className="flex justify-end space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => onViewDetails(proposal.id)}>
                      View
                    </Button>
                    {onEdit && (
                      <Button variant="secondary" size="sm" onClick={() => onEdit(proposal)}>
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button variant="danger" size="sm" onClick={() => onDelete(proposal.id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProposalsTable;

