import React, { useState, useEffect } from 'react';
import { Property, ContactPerson } from '../../types';
import Input from '../common/Input';
import LongTextInput from '../common/LongTextInput';
import Button from '../common/Button';

interface PropertyFormProps {
  initialData?: Property;
  onSubmit: (property: Omit<Property, 'id'>) => void;
  onCancel: () => void;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Property, 'id'>>(
    initialData
      ? { ...initialData }
      : {
          address: '',
          googleMapsLink: null,
          contactPersons: [{ id: Math.random().toString(36).substring(2, 9), name: '', designation: '', mobile: '', email: '' }],
          proposedRent: null, // Changed from 0 to null
          proposedArea: null, // Changed from 0 to null
          serviceFeeProposed: '',
          notes: '', // Renamed from terms
          password: '',
        }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? (value === '' ? null : parseFloat(value)) : value, // Handle empty string for numbers
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

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {initialData ? 'Edit Property' : 'Add New Property'}
      </h2>
      <Input id="address" label="Property Address" value={formData.address} onChange={handleChange} required />
      <Input id="googleMapsLink" label="Google Maps Link (Optional)" value={formData.googleMapsLink} onChange={handleChange} type="url" />

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Contact Persons</h3>
      {formData.contactPersons.map((contact, index) => (
        <div key={contact.id} className="p-4 border border-gray-200 rounded-md mb-4 bg-[#ece8e3]">
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
        id="proposedRent"
        label="Proposed Rent"
        value={formData.proposedRent}
        onChange={handleChange}
        type="number"
        min="0"
        required
      />
      <Input
        id="proposedArea"
        label="Proposed Area (sqft)"
        value={formData.proposedArea}
        onChange={handleChange}
        type="number"
        min="0"
        required
      />
      <Input
        id="serviceFeeProposed"
        label="Service Fee Proposed" // Label updated
        value={formData.serviceFeeProposed}
        onChange={handleChange}
        required
      />
      <LongTextInput id="notes" label="Notes" value={formData.notes} onChange={handleChange} /> {/* Label updated */}
      <Input id="password" label="Property Password" value={formData.password} onChange={handleChange} type="password" required />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Property' : 'Add Property'}
        </Button>
      </div>
    </form>
  );
};

export default PropertyForm;
