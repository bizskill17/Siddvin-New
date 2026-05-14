import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import PageHeader from '../common/PageHeader';
import { Brand } from '../../types';

interface CompanyCategoryViewProps {
  mode: 'company' | 'category' | 'both';
  companyOptions: string[];
  categoryOptions: string[];
  brands: Brand[];
  onAddCompany: (value: string) => Promise<void> | void;
  onAddCategory: (value: string) => Promise<void> | void;
  onRemoveCompany: (value: string) => Promise<void> | void;
  onRemoveCategory: (value: string) => Promise<void> | void;
  onBack?: () => void;
}

const CompanyCategoryView: React.FC<CompanyCategoryViewProps> = ({
  mode,
  companyOptions,
  categoryOptions,
  brands,
  onAddCompany,
  onAddCategory,
  onRemoveCompany,
  onRemoveCategory,
  onBack,
}) => {
  const [newCompany, setNewCompany] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const addCompany = async () => {
    const val = newCompany.trim();
    if (!val) return;
    await onAddCompany(val);
    setNewCompany('');
  };

  const addCategory = async () => {
    const val = newCategory.trim();
    if (!val) return;
    await onAddCategory(val);
    setNewCategory('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === 'company' ? 'Company' : mode === 'category' ? 'Category' : 'Company & Category'}
        onBack={onBack}
        backLabel="Back to Dashboard"
      />

      <div className={`grid grid-cols-1 ${mode === 'both' ? 'lg:grid-cols-2' : ''} gap-6`}>
        {(mode === 'both' || mode === 'company') && (
        <div className="bg-[#ece8e3] border border-gray-200 rounded-lg p-4">
          <div className="flex gap-2 mb-3">
            <Input id="newCompanyName" label="Add Company Name" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
            <div className="pt-8">
              <Button type="button" onClick={addCompany}>Add</Button>
            </div>
          </div>
          {companyOptions.length === 0 ? (
            <p className="text-sm text-gray-600">No company names added yet.</p>
          ) : (
            <div className="overflow-x-auto border border-black rounded">
              <table className="min-w-full border-collapse [&_th]:border [&_th]:border-black [&_td]:border [&_td]:border-black">
                <thead className="bg-orange-700 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold">Company Name</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-[#ece8e3]">
                  {companyOptions.map((name) => (
                    <tr key={name}>
                      <td className="px-3 py-2 text-sm text-gray-900">{name}</td>
                      <td className="px-3 py-2">
                        <Button type="button" size="sm" variant="danger" onClick={() => onRemoveCompany(name)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {(mode === 'both' || mode === 'category') && (
        <div className="bg-[#ece8e3] border border-gray-200 rounded-lg p-4">
          <div className="flex gap-2 mb-3">
            <Input id="newCategoryName" label="Add Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <div className="pt-8">
              <Button type="button" onClick={addCategory}>Add</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {categoryOptions.length === 0 ? (
              <p className="text-sm text-gray-600">No categories added yet.</p>
            ) : (
              categoryOptions.map((name) => {
                const linkedBrands = brands.filter((b) => (b.category || '').trim().toLowerCase() === name.trim().toLowerCase());
                const isClickable = linkedBrands.length > 0;
                const isSelected = selectedCategory === name;
                return (
                <div key={name} className={`border-2 rounded p-3 transition-colors ${isSelected ? 'border-orange-700 bg-orange-50/40' : 'border-orange-700 bg-[#ece8e3]'}`}>
                  <button
                    type="button"
                    onClick={() => isClickable && setSelectedCategory(isSelected ? null : name)}
                    className={`w-full text-left rounded px-1 py-1 ${isClickable ? 'cursor-pointer hover:bg-orange-100/40' : 'cursor-default'}`}
                    disabled={!isClickable}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${isClickable ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'}`}>
                        {linkedBrands.length} brand{linkedBrands.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </button>
                  {isSelected && isClickable && (
                    <div className="mt-2 border-t border-gray-200 pt-2 space-y-1">
                      {linkedBrands.map((b) => (
                        <div key={b.id} className="text-xs text-gray-800">{b.name}</div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <Button type="button" size="sm" variant="danger" onClick={() => onRemoveCategory(name)}>Remove</Button>
                  </div>
                </div>
              )})
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default CompanyCategoryView;
