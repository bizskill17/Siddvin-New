import React from 'react';
import { Visit } from '../../types';
import Button from '../common/Button';
import ExportIconButton from '../common/ExportIconButton';
import { formatDateDisplay } from '../common/dateUtils';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface VisitsTableProps {
  visits: Visit[];
  onEdit?: (visit: Visit) => void;
  onDelete?: (visitId: string) => void; // New prop for delete
  toolbarInline?: boolean;
  toolbarActions?: React.ReactNode;
}

const VisitsTable: React.FC<VisitsTableProps> = ({ visits, onEdit, onDelete , toolbarInline = false, toolbarActions}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const visibleVisits = visits.filter((visit) => {
    const text = [
      formatDateDisplay(visit.scheduledDate),
      visit.scheduledTime || '',
      visit.meetingType || '',
      visit.meetingAgenda || '',
      formatDateDisplay(visit.visitDate),
      visit.developerAttendees,
      visit.brandAttendees,
      visit.sidvinAttendees,
      visit.visitOutcome,
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
          placeholder="Search visits..."
          className="px-3 py-2 rounded-md border border-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <ExportIconButton
          kind="excel"
          onClick={() =>
            exportRowsToCsv(
              'visits',
              ['No.', 'Scheduled Date', 'Scheduled Time', 'Meeting Type', 'Meeting Agenda', 'Visit Date', 'Developer Attendees', 'Brand Attendees', 'Sidvin Attendees', 'Visit Outcome'],
              visibleVisits.map((v, i) => [
                i + 1,
                formatDateDisplay(v.scheduledDate),
                v.scheduledTime || 'N/A',
                v.meetingType || 'N/A',
                v.meetingAgenda || 'N/A',
                formatDateDisplay(v.visitDate),
                v.developerAttendees || 'N/A',
                v.brandAttendees || 'N/A',
                v.sidvinAttendees || 'N/A',
                v.visitOutcome || 'N/A',
              ])
            )
          }
        />
        <ExportIconButton kind="pdf" onClick={() => downloadTableAsPdf('visits-table', 'Visits')} />
        {toolbarActions}
      </div>
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-black">
      <table id="visits-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-black [&_td]:border [&_td]:border-black">
        <thead className="bg-orange-700 text-white">
          <tr>
            <th scope="col" className="py-2.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6 border-b border-black">
              No.
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Scheduled Date
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Scheduled Time
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Meeting Type
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Meeting Agenda
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Visit Date
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Developer Attendees
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Brand Attendees
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Sidvin Attendees
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Visit Outcome
            </th>
            <th scope="col" className="relative py-2.5 pl-3 pr-4 sm:pr-6 border-b border-black">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
          {visibleVisits.map((visit, index) => (
            <tr key={visit.id}>
              <td className="whitespace-nowrap py-2.5 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {index + 1}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{formatDateDisplay(visit.scheduledDate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{visit.scheduledTime || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{visit.meetingType || 'N/A'}</td>
              <td className="px-3 py-2.5 text-sm text-black">{visit.meetingAgenda || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{formatDateDisplay(visit.visitDate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{visit.developerAttendees || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{visit.brandAttendees || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{visit.sidvinAttendees || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{visit.visitOutcome || 'N/A'}</td>
              <td className="relative whitespace-nowrap py-2.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex justify-end space-x-2">
                  {onEdit && (
                    <Button variant="primary" size="sm" onClick={() => onEdit(visit)}>
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="danger" size="sm" onClick={() => onDelete(visit.id)}>
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

export default VisitsTable;





