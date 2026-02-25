import React from 'react';
import { TermSheetAgreement } from '../../types';
import Button from '../common/Button';
import { formatDateDisplay } from '../common/dateUtils';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface TermSheetAgreementsTableProps {
  termSheets: TermSheetAgreement[];
  onEdit?: (termSheet: TermSheetAgreement) => void;
  onDelete?: (proposalId: string) => void;
}

const TermSheetAgreementsTable: React.FC<TermSheetAgreementsTableProps> = ({ termSheets, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const visibleTermSheets = termSheets.filter((ts) => {
    const text = [
      formatDateDisplay(ts.preparationDate),
      formatDateDisplay(ts.finalizationDate),
      formatDateDisplay(ts.signingDate),
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
          placeholder="Search terms..."
          className="px-3 py-2 rounded-md border border-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            exportRowsToCsv(
              'terms',
              ['No.', 'Preparation Date', 'Finalization Date', 'Signing Date', 'Agreement Date', 'Agreement Reg. Date', 'Store Opening Date', 'Planned Opening Date'],
              visibleTermSheets.map((ts, i) => [
                i + 1,
                formatDateDisplay(ts.finalizationDate),
                formatDateDisplay(ts.preparationDate),
                formatDateDisplay(ts.signingDate),
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
        <Button size="sm" variant="secondary" onClick={() => downloadTableAsPdf('term-sheets-table', 'Terms')}>
          Download PDF
        </Button>
      </div>
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-black">
      <table id="term-sheets-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-black [&_td]:border [&_td]:border-black">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 border-b border-black">No.</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-black">Finalization</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-black">Preparation</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-black">Signing</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-black">Agreement</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-black">Agreement Reg.</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-black">Store Opening</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-black">Planned Opening</th>
            <th className="relative py-3.5 pl-3 pr-4 sm:pr-6 border-b border-black"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
          {visibleTermSheets.map((ts, index) => (
            <tr key={ts.proposalId}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{index + 1}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">{formatDateDisplay(ts.finalizationDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">{formatDateDisplay(ts.preparationDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">{formatDateDisplay(ts.signingDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">{formatDateDisplay(ts.agreementDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">{formatDateDisplay(ts.agreementRegistrationDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">{formatDateDisplay(ts.storeOpeningDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">{formatDateDisplay(ts.plannedOpeningDate)}</td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex justify-end space-x-2">
                  {onEdit && <Button variant="secondary" size="sm" onClick={() => onEdit(ts)}>Edit</Button>}
                  {onDelete && <Button variant="danger" size="sm" onClick={() => onDelete(ts.proposalId)}>Delete</Button>}
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

