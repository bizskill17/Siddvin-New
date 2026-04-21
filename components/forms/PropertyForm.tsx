import React, { useState, useEffect } from 'react';
import { Property, ContactPerson, UserRole } from '../../types';
import Input from '../common/Input';
import LongTextInput from '../common/LongTextInput';
import CheckboxInput from '../common/CheckboxInput';
import Button from '../common/Button';

interface PropertyFormProps {
  initialData?: Property;
  onSubmit: (property: Omit<Property, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => void;
  onCancel: () => void;
  currentUserRole: UserRole;
  currentUserName: string;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ initialData, onSubmit, onCancel, currentUserRole, currentUserName }) => {
  const getPropertyFeeStageLabel = (status: string) =>
    status === 'Pending Property Email' ? 'Pending Service Fee Email' : status;

  const [formData, setFormData] = useState<Omit<Property, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>>(
    initialData
      ? {
        address: initialData.address,
        googleMapsLink: initialData.googleMapsLink,
        contactPersons: initialData.contactPersons,
        proposedRent: initialData.proposedRent,
        proposedArea: initialData.proposedArea,
        frontage: initialData.frontage,
        noOfFloors: initialData.noOfFloors,
        serviceFeeProposed: initialData.serviceFeeProposed,
        notes: initialData.notes,
        password: initialData.password,
        propertyPhotos: initialData.propertyPhotos || [],
        drawings: initialData.drawings || [],
        cadDrawingUrl: initialData.cadDrawingUrl,
        propertyPresentation: initialData.propertyPresentation,
        propertySigningApplicable: initialData.propertySigningApplicable,
        propertyFeeEmailSent: initialData.propertyFeeEmailSent,
        propertyFeeEmailSentDate: initialData.propertyFeeEmailSentDate,
        propertyFeeAcceptanceEmailDate: initialData.propertyFeeAcceptanceEmailDate,
        propertyFeeNegotiationRequired: initialData.propertyFeeNegotiationRequired,
        propertyFeePaperSigningDate: initialData.propertyFeePaperSigningDate,
        propertyFeeStatus: initialData.propertyFeeStatus,
        propertyFeeFollowUpDate: initialData.propertyFeeFollowUpDate,
        propertyFeeFollowUpRemarks: initialData.propertyFeeFollowUpRemarks,
      }
      : {
        address: '',
        googleMapsLink: null,
        contactPersons: [{ id: Math.random().toString(36).substring(2, 9), name: '', designation: '', mobile: '', email: '', salutation: '' }],
        proposedRent: null,
        proposedArea: null,
        frontage: '',
        noOfFloors: null,
        serviceFeeProposed: '',
        notes: '',
        password: '',
        propertyPhotos: ['', '', '', '', ''],
        drawings: [''],
        cadDrawingUrl: null,
        propertyPresentation: null,
        propertySigningApplicable: false,
        propertyFeeEmailSent: false,
        propertyFeeEmailSentDate: null,
        propertyFeeAcceptanceEmailDate: null,
        propertyFeeNegotiationRequired: false,
        propertyFeePaperSigningDate: null,
        propertyFeeStatus: 'Pending Property Email',
        propertyFeeFollowUpDate: null,
        propertyFeeFollowUpRemarks: '',
      }
  );

  const getDerivedPropertyFeeStage = (data: Omit<Property, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>): Property['propertyFeeStatus'] => {
    if (!data.propertyFeeEmailSentDate) return 'Pending Property Email';
    if (!data.propertyFeeAcceptanceEmailDate) {
      return data.propertyFeeNegotiationRequired ? 'Pending Negotiation' : 'Pending Acceptance Email';
    }
    if (data.propertySigningApplicable && !data.propertyFeePaperSigningDate) return 'Pending MOU Signing';
    return 'Accepted & Signed';
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        address: initialData.address,
        googleMapsLink: initialData.googleMapsLink,
        contactPersons: initialData.contactPersons,
        proposedRent: initialData.proposedRent,
        proposedArea: initialData.proposedArea,
        frontage: initialData.frontage,
        noOfFloors: initialData.noOfFloors,
        serviceFeeProposed: initialData.serviceFeeProposed,
        notes: initialData.notes,
        password: initialData.password,
        propertyPhotos: initialData.propertyPhotos?.length ? initialData.propertyPhotos : ['', '', '', '', ''],
        drawings: initialData.drawings?.length ? initialData.drawings : [''],
        cadDrawingUrl: initialData.cadDrawingUrl,
        propertyPresentation: initialData.propertyPresentation,
        propertySigningApplicable: initialData.propertySigningApplicable,
        propertyFeeEmailSent: initialData.propertyFeeEmailSent,
        propertyFeeEmailSentDate: initialData.propertyFeeEmailSentDate,
        propertyFeeAcceptanceEmailDate: initialData.propertyFeeAcceptanceEmailDate,
        propertyFeeNegotiationRequired: initialData.propertyFeeNegotiationRequired,
        propertyFeePaperSigningDate: initialData.propertyFeePaperSigningDate,
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
      contactPersons: [...prev.contactPersons, { id: Math.random().toString(36).substring(2, 9), name: '', designation: '', mobile: '', email: '', salutation: '' }],
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmailSent = !!formData.propertyFeeEmailSentDate;
    const computedStage = getDerivedPropertyFeeStage(formData);
    onSubmit({
      ...formData,
      propertyFeeEmailSent: normalizedEmailSent,
      propertyFeeStatus: computedStage,
      propertyPhotos: formData.propertyPhotos.filter(Boolean).slice(0, 5),
      drawings: formData.drawings.slice(0, 1).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit Property' : 'Add New Property'}</h2>
        <Button type="button" variant="primary" onClick={onCancel}>Back</Button>
      </div>

      <Input id="address" label="Property Address" value={formData.address} onChange={handleChange} required />
      <Input id="googleMapsLink" label="Google Maps Link" value={formData.googleMapsLink} onChange={handleChange} type="url" required />

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Contact Persons</h3>
      {formData.contactPersons.map((contact, index) => (
        <div key={contact.id} className="p-4 border border-gray-200 rounded-md mb-4 bg-[#ece8e3]">
          <h4 className="font-medium text-gray-700 mb-2">Contact #{index + 1}</h4>
          <SelectInput id="salutation" label="Salutation" options={[{ value: 'Sir', label: 'Sir' }, { value: 'Madam', label: 'Madam' }]} value={contact.salutation || ''} onChange={(e) => handleContactChange(index, e)} required />
          <Input id="name" label="Name" value={contact.name} onChange={(e) => handleContactChange(index, e)} required />
          <Input id="designation" label="Designation" value={contact.designation} onChange={(e) => handleContactChange(index, e)} required />
          <Input id="mobile" label="Mobile" value={contact.mobile} onChange={(e) => handleContactChange(index, e)} type="tel" required />
          <Input id="email" label="Email" value={contact.email} onChange={(e) => handleContactChange(index, e)} type="email" required />
          {formData.contactPersons.length > 1 && (
            <Button type="button" variant="danger" size="sm" onClick={() => removeContactPerson(index)} className="mt-3">Remove Contact</Button>
          )}
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addContactPerson} className="mb-6 !bg-blue-900 !text-white hover:!bg-blue-950 focus:!ring-blue-900">Add Another Contact Person</Button>

      <h3 className="text-lg font-semibold mb-4 text-gray-800">Property Details</h3>
      <Input id="proposedRent" label="Proposed Rent" value={formData.proposedRent} onChange={handleChange} type="number" min="0" required />
      <Input id="proposedArea" label="Proposed Area (sqft)" value={formData.proposedArea} onChange={handleChange} type="number" min="0" step="0.01" required />
      <Input id="frontage" label="Frontage" value={formData.frontage} onChange={handleChange} required />
      <Input id="noOfFloors" label="No. of Floors" value={formData.noOfFloors} onChange={handleChange} type="number" min="0" step="1" required />

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
      <Input id="drawing-0" label="PDF Drawing URL" value={formData.drawings[0] || ''} onChange={(e) => handleDrawingChange(0, e.target.value)} type="url" />
      <Input id="cadDrawingUrl" label="CAD Drawing URL" value={formData.cadDrawingUrl} onChange={handleChange} type="url" />
      <Input id="propertyPresentation" label="Property Presentation URL" value={formData.propertyPresentation} onChange={handleChange} type="url" />

      <>
        <hr className="my-6 border-gray-200" />
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Property Coordination</h3>
        <CheckboxInput id="propertySigningApplicable" label="MOU Signing Applicable" checked={formData.propertySigningApplicable} onChange={handleChange} />
        <Input id="propertyFeeEmailSentDate" label="Email Sent Date" value={formData.propertyFeeEmailSentDate} onChange={handleChange} type="date" />
        <Input id="propertyFeeAcceptanceEmailDate" label="Acceptance Email Date" value={formData.propertyFeeAcceptanceEmailDate} onChange={handleChange} type="date" />
        <CheckboxInput id="propertyFeeNegotiationRequired" label="Negotiation Required" checked={formData.propertyFeeNegotiationRequired} onChange={handleChange} />
        <Input id="propertyFeePaperSigningDate" label="MOU Signing Date" value={formData.propertyFeePaperSigningDate} onChange={handleChange} type="date" disabled={!formData.propertySigningApplicable} />
        <Input id="propertyFeeFollowUpDate" label="Property Follow Up Date" value={formData.propertyFeeFollowUpDate} onChange={handleChange} type="date" />
        <LongTextInput id="propertyFeeFollowUpRemarks" label="Property Follow Up Remarks" value={formData.propertyFeeFollowUpRemarks} onChange={handleChange} />
        <Input id="propertyFeeStatusDisplay" label="Current Property Status" value={getPropertyFeeStageLabel(getDerivedPropertyFeeStage(formData))} readOnly />
      </>

      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Property' : 'Add Property'}</Button>
      </div>
    </form>
  );
};

export default PropertyForm;



