import React from 'react';
import { Proposal, Property, Brand, CurrentStageEnum } from '../../types';
import Button from '../common/Button';
import StageBadge from '../common/StageBadge';

interface ProposalsTableProps {
  proposals: Proposal[];
  properties: Property[];
  brands: Brand[];
  onViewDetails: (proposalId: string) => void;
  onEdit?: (proposal: Proposal) => void;
  onDelete?: (proposalId: string) => void; // New prop for delete
  selectedStage?: CurrentStageEnum | 'All'; // Keep prop for external filtering
}

const ProposalsTable: React.FC<ProposalsTableProps> = ({
  proposals,
  properties,
  brands,
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

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Proposals</h2>
        {/* Removed the stage filter dropdown from here, now in side menu */}
      </div>

      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-300">
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
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredProposals.map((proposal, index) => (
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
                  {proposal.proposalDate || 'N/A'}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <StageBadge stage={proposal.currentStage} />
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