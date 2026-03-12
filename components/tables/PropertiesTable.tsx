import React from 'react';
import { Property } from '../../types';
import Button from '../common/Button';
import ExportIconButton from '../common/ExportIconButton';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface PropertiesTableProps {
  properties: Property[];
  onEdit?: (property: Property) => void;
  onDelete?: (propertyId: string) => void; // New prop for delete
  getStatusLabel?: (property: Property) => string;
  toolbarInline?: boolean;
  toolbarActions?: React.ReactNode;
}

const PropertiesTable: React.FC<PropertiesTableProps> = ({ properties, onEdit, onDelete, getStatusLabel , toolbarInline = false, toolbarActions}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const resolveStatus = (property: Property) => (getStatusLabel ? getStatusLabel(property) : property.propertyFeeStatus);
  const visibleProperties = properties.filter((property) => {
    const text = [
      property.address,
      property.contactPersons[0]?.name || '',
      property.contactPersons[0]?.mobile || '',
      property.proposedRent ?? '',
      property.proposedArea ?? '',
      resolveStatus(property),
      property.serviceFeeProposed,
      property.notes,
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
          placeholder="Search properties..."
          className="px-3 py-2 rounded-md border border-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <ExportIconButton
          kind="excel"
          onClick={() =>
            exportRowsToCsv(
              'properties',
              ['Property Code', 'Address', 'Contact Name', 'Contact Mobile', 'Proposed Rent', 'Proposed Area', 'Property Status', 'Service Fee Proposed', 'Notes'],
              visibleProperties.map((p, i) => [
                `P-${p.serialNo || i + 1}`,
                p.address,
                p.contactPersons[0]?.name || 'N/A',
                p.contactPersons[0]?.mobile || 'N/A',
                p.proposedRent ?? 'N/A',
                p.proposedArea ?? 'N/A',
                resolveStatus(p),
                p.serviceFeeProposed,
                p.notes,
              ])
            )
          }
        />
        <ExportIconButton kind="pdf" onClick={() => downloadTableAsPdf('properties-table', 'Properties')} />
        {toolbarActions}
      </div>
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-black">
      <table id="properties-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-black [&_td]:border [&_td]:border-black">
        <thead className="bg-orange-700 text-white">
          <tr>
            <th scope="col" className="py-2.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6 border-b border-black">
              Property Code
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Address
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Contact Name
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Contact Mobile
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Proposed Rent
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Proposed Area
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Property Status
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Service Fee Proposed
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
              Notes
            </th>
            <th scope="col" className="relative py-2.5 pl-3 pr-4 sm:pr-6 border-b border-black">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
          {visibleProperties.map((property, index) => (
            <tr key={property.id}>
              <td className="whitespace-nowrap py-2.5 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {`P-${property.serialNo || index + 1}`}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{property.address}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">
                {property.contactPersons[0]?.name || 'N/A'}
                {property.contactPersons.length > 1 && ` (+${property.contactPersons.length - 1} more)`}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{property.contactPersons[0]?.mobile || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">
                {property.proposedRent !== null ? `${property.proposedRent.toLocaleString()}` : 'N/A'}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">
                {property.proposedArea !== null ? `${property.proposedArea} sqft` : 'N/A'}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{resolveStatus(property)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{property.serviceFeeProposed}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{property.notes}</td>
              <td className="relative whitespace-nowrap py-2.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex justify-end space-x-2">
                  {onEdit && (
                    <Button variant="primary" size="sm" onClick={() => onEdit(property)}>
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="danger" size="sm" onClick={() => onDelete(property.id)}>
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

export default PropertiesTable;




