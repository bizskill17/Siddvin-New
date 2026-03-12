import React from 'react';
import { FollowUp } from '../../types';
import Button from '../common/Button';
import ExportIconButton from '../common/ExportIconButton';
import { formatDateDisplay } from '../common/dateUtils';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface FollowUpsTableProps {
  followUps: FollowUp[];
  onEdit?: (followUp: FollowUp) => void;
  onDelete?: (followUpId: string) => void;
}

const FollowUpsTable: React.FC<FollowUpsTableProps> = ({ followUps, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const displayDate = (value: string | null | undefined) => {
    const formatted = formatDateDisplay(value);
    return formatted === 'N/A' ? '' : formatted;
  };
  const visibleFollowUps = followUps.filter((fu) => {
    const text = [
      formatDateDisplay(fu.followUpDate),
      fu.status,
      formatDateDisplay(fu.nextFollowUpDate),
      formatDateDisplay(fu.plannedVisitDate),
      fu.cancelRemarks || '',
      fu.remarks || '',
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
          placeholder="Search follow ups..."
          className="px-3 py-2 rounded-md border border-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <ExportIconButton
          kind="excel"
          onClick={() =>
            exportRowsToCsv(
              'follow-ups',
              ['No.', 'Follow Up Date', 'Status', 'Next Follow Up Date', 'Planned Visit Date', 'Cancel Remarks', 'Remarks'],
              visibleFollowUps.map((fu, i) => [
                i + 1,
                displayDate(fu.followUpDate),
                fu.status,
                displayDate(fu.nextFollowUpDate),
                displayDate(fu.plannedVisitDate),
                fu.cancelRemarks || '',
                fu.remarks || '',
              ])
            )
          }
        />
        <ExportIconButton kind="pdf" onClick={() => downloadTableAsPdf('followups-table', 'Follow Ups')} />
      </div>
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-black">
      <table id="followups-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-black [&_td]:border [&_td]:border-black">
        <thead className="bg-orange-700 text-white">
          <tr>
            <th scope="col" className="py-2.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6 border-b border-black">
              No.
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Follow Up Date
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Status
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Next Follow Up Date
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Planned Visit Date
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Cancel Remarks
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Remarks
            </th>
            <th scope="col" className="relative py-2.5 pl-3 pr-4 sm:pr-6 border-b border-black">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
          {visibleFollowUps.map((fu, index) => (
            <tr key={fu.id}>
              <td className="whitespace-nowrap py-2.5 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {index + 1}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{displayDate(fu.followUpDate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{fu.status}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{displayDate(fu.nextFollowUpDate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{displayDate(fu.plannedVisitDate)}</td>
              <td className="px-3 py-2.5 text-sm text-black">{fu.cancelRemarks || ''}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{fu.remarks || ''}</td>
              <td className="relative whitespace-nowrap py-2.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex justify-end space-x-2">
                  {onEdit && (
                    <Button variant="primary" size="sm" onClick={() => onEdit(fu)}>
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="danger" size="sm" onClick={() => onDelete(fu.id)}>
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

export default FollowUpsTable;





