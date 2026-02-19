import React from 'react';
import { TermSheetAgreement } from '../../types';
import Button from '../common/Button';
import { formatDateDisplay } from '../common/dateUtils';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface TermSheetAgreementsTableProps {
  termSheets: TermSheetAgreement[];
  onEdit?: (termSheet: TermSheetAgreement) => void;
  onDelete?: (proposalId: string) => void; // New prop for delete (uses proposalId as key)
}

const TermSheetAgreementsTable: React.FC<TermSheetAgreementsTableProps> = ({ termSheets, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const visibleTermSheets = termSheets.filter((ts) => {
    const text = [
      ts.proposalId.substring(0, 8),
      formatDateDisplay(ts.loiTermSheetDate),
      formatDateDisplay(ts.agreementDate),
      formatDateDisplay(ts.agreementRegistrationDate),
      formatDateDisplay(ts.storeOpeningDate),
      formatDateDisplay(ts.plannedOpeningDate),
    ].join(' ').toLowerCase();
    return text.includes(searchTerm.trim().toLowerCase());
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search term sheets..."
          className="px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            exportRowsToCsv(
              'term-sheets',
              ['No.', 'Proposal ID', 'LOI/Term Sheet Date', 'Agreement Date', 'Agreement Reg. Date', 'Store Opening Date', 'Planned Opening Date'],
              visibleTermSheets.map((ts, i) => [
                i + 1,
                `${ts.proposalId.substring(0, 8)}...`,
                formatDateDisplay(ts.loiTermSheetDate),
                formatDateDisplay(ts.agreementDate),
                formatDateDisplay(ts.agreementRegistrationDate),
                formatDateDisplay(ts.storeOpeningDate),
                formatDateDisplay(ts.plannedOpeningDate),
              ])
            )
          }
        >
          Download Excel
        </Button>
        <Button size="sm" variant="secondary" onClick={() => downloadTableAsPdf('term-sheets-table', 'Term Sheets')}>
          Download PDF
        </Button>
      </div>
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-gray-200">
      <table id="term-sheets-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-gray-300 [&_td]:border [&_td]:border-gray-300">
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
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 border-b border-gray-300">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
          {visibleTermSheets.map((ts, index) => (
            <tr key={ts.proposalId}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {index + 1}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{ts.proposalId.substring(0, 8)}...</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDateDisplay(ts.loiTermSheetDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDateDisplay(ts.agreementDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDateDisplay(ts.agreementRegistrationDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDateDisplay(ts.storeOpeningDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDateDisplay(ts.plannedOpeningDate)}</td>
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
    </div>
  );
};

export default TermSheetAgreementsTable;

