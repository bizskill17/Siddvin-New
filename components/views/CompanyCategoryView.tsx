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
  onEditCategory?: (oldValue: string, newValue: string) => Promise<void> | void;
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
  onEditCategory,
  onRemoveCompany,
  onRemoveCategory,
  onBack,
}) => {
  const [newCompany, setNewCompany] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

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

  const saveCategoryEdit = async (oldName: string) => {
    const nextName = editingCategoryName.trim();
    if (!nextName || !onEditCategory) return;
    await onEditCategory(oldName, nextName);
    setEditingCategory(null);
    setEditingCategoryName('');
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
          {categoryOptions.length === 0 ? (
            <p className="text-sm text-gray-600">No categories added yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--sidvin-line)] bg-[var(--sidvin-card)] shadow-sm">
              <table className="sidvin-category-table min-w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col" className="sidvin-category-count-column">Brands</th>
                    <th scope="col" className="sidvin-category-actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryOptions.map((name) => {
                    const linkedBrands = brands.filter((brand) => (brand.category || '').trim().toLowerCase() === name.trim().toLowerCase());
                    const isSelected = selectedCategory === name;
                    const isEditing = editingCategory === name;
                    return (
                      <React.Fragment key={name}>
                        <tr>
                          <td>
                            {isEditing ? (
                              <input
                                aria-label={`Edit category ${name}`}
                                autoFocus
                                value={editingCategoryName}
                                onChange={(event) => setEditingCategoryName(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') void saveCategoryEdit(name);
                                  if (event.key === 'Escape') { setEditingCategory(null); setEditingCategoryName(''); }
                                }}
                                className="w-full max-w-xl rounded-lg border border-[var(--sidvin-line)] bg-[var(--sidvin-card)] px-3 py-2 text-sm text-[var(--sidvin-ink)] outline-none focus:border-[var(--sidvin-orange)]"
                              />
                            ) : (
                              <span className="font-medium text-[var(--sidvin-ink)]">{name}</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`sidvin-category-brand-count ${linkedBrands.length ? 'is-linked' : ''}`}
                              onClick={() => linkedBrands.length && setSelectedCategory(isSelected ? null : name)}
                              disabled={!linkedBrands.length}
                              aria-expanded={linkedBrands.length ? isSelected : undefined}
                              title={linkedBrands.length ? 'Show linked brands' : 'No brands use this category'}
                            >
                              {linkedBrands.length} {linkedBrands.length === 1 ? 'brand' : 'brands'}
                            </button>
                          </td>
                          <td>
                            <div className="flex flex-wrap items-center gap-2">
                              {isEditing ? (
                                <>
                                  <Button type="button" size="sm" onClick={() => void saveCategoryEdit(name)}>Save</Button>
                                  <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingCategory(null); setEditingCategoryName(''); }}>Cancel</Button>
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => { setEditingCategory(name); setEditingCategoryName(name); }}
                                  aria-label={`Edit ${name}`}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931ZM19.5 7.125 16.862 4.487" /></svg>
                                    Edit
                                  </span>
                                </Button>
                              )}
                              {!isEditing && <Button type="button" size="sm" variant="danger" onClick={() => onRemoveCategory(name)}>Remove</Button>}
                            </div>
                          </td>
                        </tr>
                        {isSelected && linkedBrands.length > 0 && (
                          <tr className="sidvin-category-linked-row">
                            <td colSpan={3}>
                              <span className="mr-2 font-semibold">Brands in this category:</span>
                              {linkedBrands.map((brand) => brand.name).join(' · ')}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default CompanyCategoryView;
