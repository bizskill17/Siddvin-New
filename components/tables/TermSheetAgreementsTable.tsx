import React from 'react';
import { TermSheetAgreement } from '../../types';
import Button from '../common/Button';
import ExportIconButton from '../common/ExportIconButton';
import { formatDateDisplay } from '../common/dateUtils';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface TermSheetAgreementsTableProps {
  termSheets: TermSheetAgreement[];
  onEdit?: (termSheet: TermSheetAgreement) => void;
  onDelete?: (proposalId: string) => void;
  toolbarInline?: boolean;
  toolbarActions?: React.ReactNode;
}

const TermSheetAgreementsTable: React.FC<TermSheetAgreementsTableProps> = ({ termSheets, onEdit, onDelete , toolbarInline = false, toolbarActions}) => {
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

  const toolbarClassName = `mb-4 flex flex-wrap items-center justify-end gap-2 ${toolbarInline ? 'sm:-mt-[4.25rem]' : ''}`;

  return (
    <div>
      <div className={toolbarClassName}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search terms..."
          className="px-3 py-2 rounded-md border border-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <ExportIconButton
          kind="excel"
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
        />
        <ExportIconButton kind="pdf" onClick={() => downloadTableAsPdf('term-sheets-table', 'Terms')} />
        {toolbarActions}
      </div>
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-black">
      <table id="term-sheets-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-black [&_td]:border [&_td]:border-black">
        <thead className="bg-orange-700 text-white">
          <tr>
            <th className="py-2.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6 border-b border-black">No.</th>
            <th className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">Finalization</th>
            <th className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">Preparation</th>
            <th className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">Signing</th>
            <th className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">Agreement</th>
            <th className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">Agreement Reg.</th>
            <th className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">Store Opening</th>
            <th className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">Planned Opening</th>
            <th className="relative py-2.5 pl-3 pr-4 sm:pr-6 border-b border-black"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
          {visibleTermSheets.map((ts, index) => (
            <tr key={ts.proposalId}>
              <td className="whitespace-nowrap py-2.5 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{index + 1}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{formatDateDisplay(ts.finalizationDate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{formatDateDisplay(ts.preparationDate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{formatDateDisplay(ts.signingDate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{formatDateDisplay(ts.agreementDate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{formatDateDisplay(ts.agreementRegistrationDate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{formatDateDisplay(ts.storeOpeningDate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{formatDateDisplay(ts.plannedOpeningDate)}</td>
              <td className="relative whitespace-nowrap py-2.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex justify-end space-x-1">
                  {onEdit && (
                    <Button variant="primary" size="sm" onClick={() => onEdit(ts)} title="Edit" className="p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="danger" size="sm" onClick={() => onDelete(ts.proposalId)} title="Delete" className="p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
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




