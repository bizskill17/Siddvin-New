import React, { useState, useEffect } from 'react';
import { Brand, ContactPerson, SidvinTeamMember } from '../../types';
import Input from '../common/Input';
import Button from '../common/Button';
import SelectInput from '../common/SelectInput';
// import * as dataService from '../../services/dataService'; // No longer needed directly here

interface BrandFormProps {
  initialData?: Brand;
  onSubmit: (brand: Omit<Brand, 'id'>) => void;
  onCancel: () => void;
  sidvinTeamMembers: SidvinTeamMember[]; // Pass sidvinTeamMembers as props
}

const BrandForm: React.FC<BrandFormProps> = ({ initialData, onSubmit, onCancel, sidvinTeamMembers }) => {
  const [formData, setFormData] = useState<Omit<Brand, 'id'>>(
    initialData
      ? { ...initialData }
      : {
          name: '',
          contactPersons: [{ id: Math.random().toString(36).substring(2, 9), name: '', designation: '', mobile: '', email: '' }],
          serviceFeeAgreed: '',
          assignedRep: sidvinTeamMembers[0]?.email || '', // Default to first rep's email
          logoUrl: null,
        }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      // Set default assignedRep if not in initialData and team members exist
      setFormData(prev => ({
        ...prev,
        assignedRep: prev.assignedRep || sidvinTeamMembers[0]?.email || ''
      }));
    }
  }, [initialData, sidvinTeamMembers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleContactChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const updatedContacts = formData.contactPersons.map((contact, i) =>
      i === index ? { ...contact, [id]: value } : contact
    );
    setFormData((prev) => ({
      ...prev,
      contactPersons: updatedContacts,
    }));
  };

  const addContactPerson = () => {
    setFormData((prev) => ({
      ...prev,
      contactPersons: [
        ...prev.contactPersons,
        { id: Math.random().toString(36).substring(2, 9), name: '', designation: '', mobile: '', email: '' },
      ],
    }));
  };

  const removeContactPerson = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contactPersons: prev.contactPersons.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const assignedRepOptions = sidvinTeamMembers.map(member => ({
    value: member.email,
    label: `${member.name} (${member.designation})`
  }));

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {initialData ? 'Edit Brand' : 'Add New Brand'}
      </h2>
      <Input id="name" label="Brand Name" value={formData.name} onChange={handleChange} required />
      <Input id="logoUrl" label="Brand Logo URL (Optional)" value={formData.logoUrl} onChange={handleChange} type="url" />

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Contact Persons</h3>
      {formData.contactPersons.map((contact, index) => (
        <div key={contact.id} className="p-4 border border-gray-200 rounded-md mb-4 bg-gray-50">
          <h4 className="font-medium text-gray-700 mb-2">Contact #{index + 1}</h4>
          <Input
            id="name"
            label="Name"
            value={contact.name}
            onChange={(e) => handleContactChange(index, e)}
            required
          />
          <Input
            id="designation"
            label="Designation"
            value={contact.designation}
            onChange={(e) => handleContactChange(index, e)}
            required
          />
          <Input
            id="mobile"
            label="Mobile"
            value={contact.mobile}
            onChange={(e) => handleContactChange(index, e)}
            type="tel"
            required
          />
          <Input
            id="email"
            label="Email"
            value={contact.email}
            onChange={(e) => handleContactChange(index, e)}
            type="email"
            required
          />
          {formData.contactPersons.length > 1 && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => removeContactPerson(index)}
              className="mt-3"
            >
              Remove Contact
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addContactPerson} className="mb-6">
        Add Another Contact Person
      </Button>
      <hr className="my-6 border-gray-200" />

      <Input
        id="serviceFeeAgreed"
        label="Service Fee Agreed" // Label updated
        value={formData.serviceFeeAgreed}
        onChange={handleChange}
        required
      />
      {assignedRepOptions.length > 0 ? (
        <SelectInput
          id="assignedRep"
          label="Assigned Representative"
          options={assignedRepOptions}
          value={formData.assignedRep}
          onChange={handleChange}
          required
        />
      ) : (
        <p className="text-red-500 text-sm mb-4">No Sidvin Team Members available. Please add some in the "Sidvin Team" tab.</p>
      )}


      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Brand' : 'Add Brand'}
        </Button>
      </div>
    </form>
  );
};

export default BrandForm;