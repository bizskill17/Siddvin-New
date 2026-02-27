import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';

interface CompanyCategoryViewProps {
  companyOptions: string[];
  categoryOptions: string[];
  onAddCompany: (value: string) => void;
  onAddCategory: (value: string) => void;
  onRemoveCompany: (value: string) => void;
  onRemoveCategory: (value: string) => void;
}

const CompanyCategoryView: React.FC<CompanyCategoryViewProps> = ({
  companyOptions,
  categoryOptions,
  onAddCompany,
  onAddCategory,
  onRemoveCompany,
  onRemoveCategory,
}) => {
  const [newCompany, setNewCompany] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const addCompany = () => {
    const val = newCompany.trim();
    if (!val) return;
    onAddCompany(val);
    setNewCompany('');
  };

  const addCategory = () => {
    const val = newCategory.trim();
    if (!val) return;
    onAddCategory(val);
    setNewCategory('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Company & Category Master</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#ece8e3] border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Company Names</h2>
          <div className="flex gap-2 mb-3">
            <Input id="newCompanyName" label="Add Company Name" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
            <div className="pt-8">
              <Button type="button" onClick={addCompany}>Add</Button>
            </div>
          </div>
          <div className="space-y-2">
            {companyOptions.length === 0 ? (
              <p className="text-sm text-gray-600">No company names added yet.</p>
            ) : (
              companyOptions.map((name) => (
                <div key={name} className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
                  <span className="text-sm text-gray-900">{name}</span>
                  <Button type="button" size="sm" variant="danger" onClick={() => onRemoveCompany(name)}>Remove</Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#ece8e3] border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Categories</h2>
          <div className="flex gap-2 mb-3">
            <Input id="newCategoryName" label="Add Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <div className="pt-8">
              <Button type="button" onClick={addCategory}>Add</Button>
            </div>
          </div>
          <div className="space-y-2">
            {categoryOptions.length === 0 ? (
              <p className="text-sm text-gray-600">No categories added yet.</p>
            ) : (
              categoryOptions.map((name) => (
                <div key={name} className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
                  <span className="text-sm text-gray-900">{name}</span>
                  <Button type="button" size="sm" variant="danger" onClick={() => onRemoveCategory(name)}>Remove</Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyCategoryView;

