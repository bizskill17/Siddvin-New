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
          contactPersons: [{ id: Math.random().toString(36).substring(2, 9), name: '', designation: '', mobile: '', email: '', salutation: '' }],
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
      contactPersons: [...prev.contactPersons, { id: Math.random().toString(36).substring(2, 9), name: '', designation: '', mobile: '', email: '', salutation: '' }],
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
    <form onSubmit={handleSubmit} className="sidvin-form">
      <div className="sidvin-form-heading">
        <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit Brand' : 'Add New Brand'}</h2>
      </div>

      <section className="sidvin-form-section"><h3>Brand details</h3><div className="sidvin-form-grid">
      <Input id="name" label="Brand Name" value={formData.name} onChange={handleChange} required />
      <SelectInput id="companyName" label="Company Name" options={resolvedCompanyOptions} value={formData.companyName} onChange={handleChange} required placeholder="Select Company Name" />
      <SelectInput id="category" label="Category" options={resolvedCategoryOptions} value={formData.category} onChange={handleChange} required placeholder="Select Category" />
      <Input id="logoUrl" label="Brand Logo URL (Optional)" value={formData.logoUrl} onChange={handleChange} type="url" />

      </div></section>
      <section className="sidvin-form-section"><h3>Contact persons</h3>
      {formData.contactPersons.map((contact, index) => (
        <div key={contact.id} className="sidvin-contact-card">
          <h4 className="font-medium text-gray-700 mb-2">Contact #{index + 1}</h4><div className="sidvin-form-grid sidvin-contact-grid">
          <SelectInput id="salutation" label="Salutation" options={[{ value: 'Sir', label: 'Sir' }, { value: 'Madam', label: 'Madam' }]} value={contact.salutation || ''} onChange={(e) => handleContactChange(index, e)} required />
          <Input id="name" label="Name" value={contact.name} onChange={(e) => handleContactChange(index, e)} required />
          <Input id="designation" label="Designation" value={contact.designation} onChange={(e) => handleContactChange(index, e)} required />
          <Input id="mobile" label="Mobile" value={contact.mobile} onChange={(e) => handleContactChange(index, e)} type="tel" required />
          <Input id="email" label="Email" value={contact.email} onChange={(e) => handleContactChange(index, e)} type="email" required />
          </div>{formData.contactPersons.length > 1 && <Button type="button" variant="danger" size="sm" onClick={() => removeContactPerson(index)} className="mt-3">Remove Contact</Button>}
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addContactPerson} className="mb-6">Add Another Contact Person</Button>

      </section><section className="sidvin-form-section"><h3>Commercial details</h3><div className="sidvin-form-grid">
      <Input id="serviceFeeAgreed" label="Service Fee Agreed" value={formData.serviceFeeAgreed} onChange={handleChange} required />
      <SelectInput id="assignedRep" label="Assigned Representative" options={assignedRepOptions} value={formData.assignedRep} onChange={handleChange} required placeholder="Select Assigned Representative" />
      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      </div></section>
      <div className="sidvin-form-footer">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Brand' : 'Add Brand'}</Button>
      </div>
    </form>
  );
};

export default BrandForm;
