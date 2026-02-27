import React from 'react';
import { Brand } from '../../types';
import Button from '../common/Button';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface BrandsTableProps {
  brands: Brand[];
  onEdit?: (brand: Brand) => void;
  onDelete?: (brandId: string) => void; // New prop for delete
}

const BrandsTable: React.FC<BrandsTableProps> = ({ brands, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const visibleBrands = brands.filter((brand) => {
    const text = [
      brand.name,
      brand.contactPersons[0]?.name || '',
      brand.contactPersons[0]?.mobile || '',
      brand.serviceFeeAgreed,
      brand.assignedRep,
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
          placeholder="Search brands..."
          className="px-3 py-2 rounded-md border border-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            exportRowsToCsv(
              'brands',
              ['Brand Code', 'Brand Name', 'Contact Person', 'Contact Mobile', 'Service Fee Agreed', 'Assigned Rep'],
              visibleBrands.map((b, i) => [
                `B-${b.serialNo || i + 1}`,
                b.name,
                b.contactPersons[0]?.name || 'N/A',
                b.contactPersons[0]?.mobile || 'N/A',
                b.serviceFeeAgreed,
                b.assignedRep,
              ])
            )
          }
        >
          Download Excel
        </Button>
        <Button size="sm" variant="secondary" onClick={() => downloadTableAsPdf('brands-table', 'Brands')}>
          Download PDF
        </Button>
      </div>
    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-black">
      <table id="brands-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-black [&_td]:border [&_td]:border-black">
        <thead className="bg-orange-700 text-white">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6 border-b border-black">
              Brand Code
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white border-b border-black">
              Logo
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white border-b border-black">
              Brand Name
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white border-b border-black">
              Contact Person
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white border-b border-black">
              Contact Mobile
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white border-b border-black">
              Service Fee Agreed
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white border-b border-black">
              Assigned Rep
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 border-b border-black">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
          {visibleBrands.map((brand, index) => (
            <tr key={brand.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {`B-${brand.serialNo || index + 1}`}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">
                {brand.logoUrl ? (
                  <div className="h-14 w-20 flex items-center justify-start">
                    <img src={brand.logoUrl} alt={`${brand.name} Logo`} className="h-12 w-16 object-contain" />
                  </div>
                ) : (
                  'N/A'
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                {brand.name}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">
                {brand.contactPersons[0]?.name || 'N/A'}
                {brand.contactPersons.length > 1 && ` (+${brand.contactPersons.length - 1} more)`}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">{brand.contactPersons[0]?.mobile || 'N/A'}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">{brand.serviceFeeAgreed}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-black">{brand.assignedRep}</td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex justify-end space-x-2">
                  {onEdit && (
                    <Button variant="primary" size="sm" onClick={() => onEdit(brand)}>
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="danger" size="sm" onClick={() => onDelete(brand.id)}>
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

export default BrandsTable;




