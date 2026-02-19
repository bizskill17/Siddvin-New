import React from 'react';
import { TermSheetAgreement } from '../../types';
import Button from '../common/Button';

interface TermSheetAgreementsTableProps {
  termSheets: TermSheetAgreement[];
  onEdit?: (termSheet: TermSheetAgreement) => void;
  onDelete?: (proposalId: string) => void; // New prop for delete (uses proposalId as key)
}

const TermSheetAgreementsTable: React.FC<TermSheetAgreementsTableProps> = ({ termSheets, onEdit, onDelete }) => {
  return (
    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 border-b border-gray-300">
              No.
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Proposal ID
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              LOI/Term Sheet Date
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Agreement Date
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Agreement Reg. Date
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Store Opening Date
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Planned Opening Date
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Facilities Summary
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 border-b border-gray-300">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {termSheets.map((ts, index) => (
            <tr key={ts.proposalId}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {index + 1}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{ts.proposalId.substring(0, 8)}...</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{ts.loiTermSheetDate || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{ts.agreementDate || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{ts.agreementRegistrationDate || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{ts.storeOpeningDate || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{ts.plannedOpeningDate || 'N/A'}</td>
              <td className="px-3 py-4 text-sm text-gray-500">
                <ul className="list-disc list-inside text-xs">
                  {ts.ac && <li>AC: {ts.ac}</li>}
                  {ts.fireFightingSystem && <li>Fire: {ts.fireFightingSystem}</li>}
                  {ts.flooring && <li>Floor: {ts.flooring}</li>}
                  {!ts.ac && !ts.fireFightingSystem && !ts.flooring && <li>N/A</li>}
                </ul>
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex justify-end space-x-2">
                  {onEdit && (
                    <Button variant="secondary" size="sm" onClick={() => onEdit(ts)}>
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="danger" size="sm" onClick={() => onDelete(ts.proposalId)}>
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
  );
};

export default TermSheetAgreementsTable;