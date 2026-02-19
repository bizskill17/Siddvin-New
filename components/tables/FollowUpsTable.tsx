import React from 'react';
import { FollowUp } from '../../types';
import Button from '../common/Button';
import { formatDateDisplay } from '../common/dateUtils';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface FollowUpsTableProps {
  followUps: FollowUp[];
  onEdit?: (followUp: FollowUp) => void;
  onDelete?: (followUpId: string) => void;
}

const FollowUpsTable: React.FC<FollowUpsTableProps> = ({ followUps, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
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
          className="px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            exportRowsToCsv(
              'follow-ups',
              ['No.', 'Follow Up Date', 'Status', 'Next Follow Up Date', 'Planned Visit Date', 'Cancel Remarks', 'Remarks'],
              visibleFollowUps.map((fu, i) => [
                i + 1,
                formatDateDisplay(fu.followUpDate),
                fu.status,
                formatDateDisplay(fu.nextFollowUpDate),
                formatDateDisplay(fu.plannedVisitDate),
                fu.cancelRemarks || 'N/A',
                fu.remarks || 'N/A',
              ])
            )
          }
        >
          Download Excel
        </Button>
        <Button size="sm" variant="secondary" onClick={() => downloadTableAsPdf('followups-table', 'Follow Ups')}>
          Download PDF
        </Button>
      </div>
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-gray-200">
      <table id="followups-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-gray-300 [&_td]:border [&_td]:border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 border-b border-gray-300">
              No.
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Follow Up Date
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Status
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Next Follow Up Date
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Planned Visit Date
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Cancel Remarks
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Remarks
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 border-b border-gray-300">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
          {visibleFollowUps.map((fu, index) => (
            <tr key={fu.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {index + 1}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDateDisplay(fu.followUpDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{fu.status}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDateDisplay(fu.nextFollowUpDate)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDateDisplay(fu.plannedVisitDate)}</td>
              <td className="px-3 py-4 text-sm text-gray-500">{fu.cancelRemarks || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{fu.remarks || 'N/A'}</td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex justify-end space-x-2">
                  {onEdit && (
                    <Button variant="secondary" size="sm" onClick={() => onEdit(fu)}>
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

