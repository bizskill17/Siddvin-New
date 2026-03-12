import React, { useState, useEffect } from 'react';
import { Brand, SidvinTeamMember } from '../../types';
import Input from '../common/Input';
import Button from '../common/Button';
import SelectInput from '../common/SelectInput';

interface BrandFormProps {
  initialData?: Brand;
  onSubmit: (brand: Omit<Brand, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => void;
  onCancel: () => void;
  sidvinTeamMembers: SidvinTeamMember[];
  companyOptions: string[];
  categoryOptions: string[];
  currentUserName: string;
}

const BrandForm: React.FC<BrandFormProps> = ({ initialData, onSubmit, onCancel, sidvinTeamMembers, companyOptions, categoryOptions, currentUserName }) => {
  const [formData, setFormData] = useState<Omit<Brand, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>>(
    initialData
      ? {
          name: initialData.name,
          companyName: initialData.companyName,
          category: initialData.category,
          contactPersons: initialData.contactPersons,
          serviceFeeAgreed: initialData.serviceFeeAgreed,
          assignedRep: initialData.assignedRep,
          logoUrl: initialData.logoUrl,
        }
      : {
          name: '',
          companyName: '',
          category: '',
          contactPersons: [{ id: Math.random().toString(36).substring(2, 9), name: '', designation: '', mobile: '', email: '' }],
          serviceFeeAgreed: '',
          assignedRep: '',
          logoUrl: null,
        }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        companyName: initialData.companyName,
        category: initialData.category,
        contactPersons: initialData.contactPersons,
        serviceFeeAgreed: initialData.serviceFeeAgreed,
        assignedRep: initialData.assignedRep,
        logoUrl: initialData.logoUrl,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleContactChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const updatedContacts = formData.contactPersons.map((contact, i) => i === index ? { ...contact, [id]: value } : contact);
    setFormData((prev) => ({ ...prev, contactPersons: updatedContacts }));
  };

  const addContactPerson = () => {
    setFormData((prev) => ({
      ...prev,
      contactPersons: [...prev.contactPersons, { id: Math.random().toString(36).substring(2, 9), name: '', designation: '', mobile: '', email: '' }],
    }));
  };

  const removeContactPerson = (index: number) => {
    setFormData((prev) => ({ ...prev, contactPersons: prev.contactPersons.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const assignedRepOptions = sidvinTeamMembers.map(member => ({ value: member.email, label: `${member.name} (${member.designation})` }));
  const resolvedCompanyOptions = Array.from(new Set([...companyOptions, formData.companyName].filter(Boolean))).map(v => ({ value: v, label: v }));
  const resolvedCategoryOptions = Array.from(new Set([...categoryOptions, formData.category].filter(Boolean))).map(v => ({ value: v, label: v }));

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit Brand' : 'Add New Brand'}</h2>
        <Button type="button" variant="primary" onClick={onCancel}>Back</Button>
      </div>

      <Input id="name" label="Brand Name" value={formData.name} onChange={handleChange} required />
      <SelectInput id="companyName" label="Company Name" options={resolvedCompanyOptions} value={formData.companyName} onChange={handleChange} required placeholder="Select Company Name" />
      <SelectInput id="category" label="Category" options={resolvedCategoryOptions} value={formData.category} onChange={handleChange} required placeholder="Select Category" />
      <Input id="logoUrl" label="Brand Logo URL (Optional)" value={formData.logoUrl} onChange={handleChange} type="url" />

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Contact Persons</h3>
      {formData.contactPersons.map((contact, index) => (
        <div key={contact.id} className="p-4 border border-gray-200 rounded-md mb-4 bg-[#ece8e3]">
          <h4 className="font-medium text-gray-700 mb-2">Contact #{index + 1}</h4>
          <Input id="name" label="Name" value={contact.name} onChange={(e) => handleContactChange(index, e)} required />
          <Input id="designation" label="Designation" value={contact.designation} onChange={(e) => handleContactChange(index, e)} required />
          <Input id="mobile" label="Mobile" value={contact.mobile} onChange={(e) => handleContactChange(index, e)} type="tel" required />
          <Input id="email" label="Email" value={contact.email} onChange={(e) => handleContactChange(index, e)} type="email" required />
          {formData.contactPersons.length > 1 && <Button type="button" variant="danger" size="sm" onClick={() => removeContactPerson(index)} className="mt-3">Remove Contact</Button>}
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addContactPerson} className="mb-6">Add Another Contact Person</Button>

      <Input id="serviceFeeAgreed" label="Service Fee Agreed" value={formData.serviceFeeAgreed} onChange={handleChange} required />
      <SelectInput id="assignedRep" label="Assigned Representative" options={assignedRepOptions} value={formData.assignedRep} onChange={handleChange} required placeholder="Select Assigned Representative" />
      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Brand' : 'Add Brand'}</Button>
      </div>
    </form>
  );
};

export default BrandForm;



