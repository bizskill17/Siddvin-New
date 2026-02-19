import React from 'react';
import { Property } from '../../types';
import Button from '../common/Button';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface PropertiesTableProps {
  properties: Property[];
  onEdit?: (property: Property) => void;
  onDelete?: (propertyId: string) => void; // New prop for delete
}

const PropertiesTable: React.FC<PropertiesTableProps> = ({ properties, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const visibleProperties = properties.filter((property) => {
    const text = [
      property.address,
      property.contactPersons[0]?.name || '',
      property.contactPersons[0]?.mobile || '',
      property.proposedRent ?? '',
      property.proposedArea ?? '',
      property.serviceFeeProposed,
      property.notes,
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
          placeholder="Search properties..."
          className="px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            exportRowsToCsv(
              'properties',
              ['No.', 'Address', 'Contact Name', 'Contact Mobile', 'Proposed Rent', 'Proposed Area', 'Service Fee Proposed', 'Notes'],
              visibleProperties.map((p, i) => [
                i + 1,
                p.address,
                p.contactPersons[0]?.name || 'N/A',
                p.contactPersons[0]?.mobile || 'N/A',
                p.proposedRent ?? 'N/A',
                p.proposedArea ?? 'N/A',
                p.serviceFeeProposed,
                p.notes,
              ])
            )
          }
        >
          Download Excel
        </Button>
        <Button size="sm" variant="secondary" onClick={() => downloadTableAsPdf('properties-table', 'Properties')}>
          Download PDF
        </Button>
      </div>
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-gray-200">
      <table id="properties-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-gray-300 [&_td]:border [&_td]:border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 border-b border-gray-300">
              No.
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Address
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Contact Name
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Contact Mobile
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Proposed Rent
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Proposed Area
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Service Fee Proposed
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
              Notes
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 border-b border-gray-300">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
          {visibleProperties.map((property, index) => (
            <tr key={property.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {index + 1}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{property.address}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {property.contactPersons[0]?.name || 'N/A'}
                {property.contactPersons.length > 1 && ` (+${property.contactPersons.length - 1} more)`}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{property.contactPersons[0]?.mobile || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {property.proposedRent !== null ? `${property.proposedRent.toLocaleString()}` : 'N/A'}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {property.proposedArea !== null ? `${property.proposedArea} sqft` : 'N/A'}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{property.serviceFeeProposed}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{property.notes}</td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex justify-end space-x-2">
                  {onEdit && (
                    <Button variant="secondary" size="sm" onClick={() => onEdit(property)}>
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
