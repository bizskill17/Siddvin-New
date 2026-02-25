import React, { useState, useEffect } from 'react';
import { Property, ContactPerson, UserRole } from '../../types';
import Input from '../common/Input';
import LongTextInput from '../common/LongTextInput';
import CheckboxInput from '../common/CheckboxInput';
import SelectInput from '../common/SelectInput';
import Button from '../common/Button';

interface PropertyFormProps {
  initialData?: Property;
  onSubmit: (property: Omit<Property, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => void;
  onCancel: () => void;
  currentUserRole: UserRole;
  currentUserName: string;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ initialData, onSubmit, onCancel, currentUserRole, currentUserName }) => {
  const [formData, setFormData] = useState<Omit<Property, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>>(
    initialData
      ? {
          address: initialData.address,
          googleMapsLink: initialData.googleMapsLink,
          contactPersons: initialData.contactPersons,
          proposedRent: initialData.proposedRent,
          proposedArea: initialData.proposedArea,
          serviceFeeProposed: initialData.serviceFeeProposed,
          notes: initialData.notes,
          password: initialData.password,
          propertyPhotos: initialData.propertyPhotos || [],
          drawings: initialData.drawings || [],
          propertyPresentation: initialData.propertyPresentation,
          propertyFeeEmailSent: initialData.propertyFeeEmailSent,
          propertyFeeStatus: initialData.propertyFeeStatus,
          propertyFeeFollowUpDate: initialData.propertyFeeFollowUpDate,
          propertyFeeFollowUpRemarks: initialData.propertyFeeFollowUpRemarks,
        }
      : {
          address: '',
          googleMapsLink: null,
          contactPersons: [{ id: Math.random().toString(36).substring(2, 9), name: '', designation: '', mobile: '', email: '' }],
          proposedRent: null,
          proposedArea: null,
          serviceFeeProposed: '',
          notes: '',
          password: '',
          propertyPhotos: ['', '', '', '', ''],
          drawings: [''],
          propertyPresentation: null,
          propertyFeeEmailSent: false,
          propertyFeeStatus: 'Pending Email',
          propertyFeeFollowUpDate: null,
          propertyFeeFollowUpRemarks: '',
        }
  );

  const canManagePropertyFee = currentUserRole === 'Super Admin' || currentUserRole === 'Property Fee Coordinator';

  useEffect(() => {
    if (initialData) {
      setFormData({
        address: initialData.address,
        googleMapsLink: initialData.googleMapsLink,
        contactPersons: initialData.contactPersons,
        proposedRent: initialData.proposedRent,
        proposedArea: initialData.proposedArea,
        serviceFeeProposed: initialData.serviceFeeProposed,
        notes: initialData.notes,
        password: initialData.password,
        propertyPhotos: initialData.propertyPhotos?.length ? initialData.propertyPhotos : ['', '', '', '', ''],
        drawings: initialData.drawings?.length ? initialData.drawings : [''],
        propertyPresentation: initialData.propertyPresentation,
        propertyFeeEmailSent: initialData.propertyFeeEmailSent,
        propertyFeeStatus: initialData.propertyFeeStatus,
        propertyFeeFollowUpDate: initialData.propertyFeeFollowUpDate,
        propertyFeeFollowUpRemarks: initialData.propertyFeeFollowUpRemarks,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? null : parseFloat(value)) : value,
    }));
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

  const handlePhotoChange = (index: number, value: string) => {
    setFormData((prev) => {
      const next = [...prev.propertyPhotos];
      next[index] = value;
      return { ...prev, propertyPhotos: next };
    });
  };

  const handleDrawingChange = (index: number, value: string) => {
    setFormData((prev) => {
      const next = [...prev.drawings];
      next[index] = value;
      return { ...prev, drawings: next };
    });
  };

  const addDrawing = () => {
    setFormData((prev) => ({ ...prev, drawings: [...prev.drawings, ''] }));
  };

  const removeDrawing = (index: number) => {
    setFormData((prev) => ({ ...prev, drawings: prev.drawings.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      propertyPhotos: formData.propertyPhotos.filter(Boolean).slice(0, 5),
      drawings: formData.drawings.filter(Boolean),
    });
  };

  const propertyFeeStatusOptions = [
    { value: 'Pending Email', label: 'Pending Email' },
    { value: 'Pending Follow Up', label: 'Pending Follow Up' },
    { value: 'Negotiation Required', label: 'Negotiation Required' },
    { value: 'Pending Acceptance Email', label: 'Pending Acceptance Email' },
    { value: 'Pending Papers Signing', label: 'Pending Papers Signing' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit Property' : 'Add New Property'}</h2>
        <Button type="button" variant="secondary" onClick={onCancel}>Back</Button>
      </div>

      <Input id="address" label="Property Address" value={formData.address} onChange={handleChange} required />
      <Input id="googleMapsLink" label="Google Maps Link (Optional)" value={formData.googleMapsLink} onChange={handleChange} type="url" />

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Contact Persons</h3>
      {formData.contactPersons.map((contact, index) => (
        <div key={contact.id} className="p-4 border border-gray-200 rounded-md mb-4 bg-[#ece8e3]">
          <h4 className="font-medium text-gray-700 mb-2">Contact #{index + 1}</h4>
          <Input id="name" label="Name" value={contact.name} onChange={(e) => handleContactChange(index, e)} required />
          <Input id="designation" label="Designation" value={contact.designation} onChange={(e) => handleContactChange(index, e)} required />
          <Input id="mobile" label="Mobile" value={contact.mobile} onChange={(e) => handleContactChange(index, e)} type="tel" required />
          <Input id="email" label="Email" value={contact.email} onChange={(e) => handleContactChange(index, e)} type="email" required />
          {formData.contactPersons.length > 1 && (
            <Button type="button" variant="danger" size="sm" onClick={() => removeContactPerson(index)} className="mt-3">Remove Contact</Button>
          )}
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addContactPerson} className="mb-6">Add Another Contact Person</Button>

      <Input id="proposedRent" label="Proposed Rent" value={formData.proposedRent} onChange={handleChange} type="number" min="0" required />
      <Input id="proposedArea" label="Proposed Area (sqft)" value={formData.proposedArea} onChange={handleChange} type="number" min="0" step="0.01" required />
      
      <Input id="serviceFeeProposed" label="Service Fee Proposed" value={formData.serviceFeeProposed} onChange={handleChange} required />
      <LongTextInput id="notes" label="Notes" value={formData.notes} onChange={handleChange} />
      <Input id="password" label="Property Password" value={formData.password} onChange={handleChange} type="password" required />

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Property Files</h3>
      {[0, 1, 2, 3, 4].map((idx) => (
        <Input
          key={`photo-${idx}`}
          id={`propertyPhoto-${idx}`}
          label={`Property Photograph ${idx + 1} URL`}
          value={formData.propertyPhotos[idx] || ''}
          onChange={(e) => handlePhotoChange(idx, e.target.value)}
          type="url"
        />
      ))}
      {formData.drawings.map((drawing, idx) => (
        <div key={`drawing-${idx}`} className="mb-2">
          <Input id={`drawing-${idx}`} label={`Drawing ${idx + 1} URL`} value={drawing} onChange={(e) => handleDrawingChange(idx, e.target.value)} type="url" />
          {formData.drawings.length > 1 && <Button type="button" size="sm" variant="danger" onClick={() => removeDrawing(idx)}>Remove Drawing</Button>}
        </div>
      ))}
      <Button type="button" size="sm" variant="secondary" onClick={addDrawing} className="mb-4">Add Drawing</Button>
      <Input id="propertyPresentation" label="Property Presentation URL" value={formData.propertyPresentation} onChange={handleChange} type="url" />

      {canManagePropertyFee && (
        <>
          <hr className="my-6 border-gray-200" />
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Property Fee Coordination</h3>
          <CheckboxInput id="propertyFeeEmailSent" label="Property Fee Email Sent" checked={formData.propertyFeeEmailSent} onChange={handleChange} />
          <SelectInput id="propertyFeeStatus" label="Property Fee Status" options={propertyFeeStatusOptions} value={formData.propertyFeeStatus} onChange={handleChange} required />
          <Input id="propertyFeeFollowUpDate" label="Property Fee Follow Up Date" value={formData.propertyFeeFollowUpDate} onChange={handleChange} type="date" />
          <LongTextInput id="propertyFeeFollowUpRemarks" label="Property Fee Follow Up Remarks" value={formData.propertyFeeFollowUpRemarks} onChange={handleChange} />
        </>
      )}

      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Property' : 'Add Property'}</Button>
      </div>
    </form>
  );
};

export default PropertyForm;
