import React, { useState, useEffect } from 'react';
import { Proposal, Property, Brand, SidvinTeamMember } from '../../types';
import DateInput from '../common/DateInput';
import LongTextInput from '../common/LongTextInput';
import CheckboxInput from '../common/CheckboxInput';
import SelectInput from '../common/SelectInput';
import Button from '../common/Button';

interface ProposalFormProps {
  initialData?: Proposal;
  properties: Property[];
  brands: Brand[];
  sidvinTeamMembers: SidvinTeamMember[];
  hasCompletedVisits: boolean;
  onSubmit: (proposal: Omit<Proposal, 'id' | 'currentStage'>) => void;
  onCancel: () => void;
}

const ProposalForm: React.FC<ProposalFormProps> = ({
  initialData,
  properties,
  brands,
  sidvinTeamMembers,
  hasCompletedVisits,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Omit<Proposal, 'id' | 'currentStage'>>(
    initialData
      ? { ...initialData }
      : {
          propertyId: '',
          brandId: '',
          proposalDate: null,
          proposalSender: '',
          brandRemarks: '',
          specificDetailsRequiredByBrand: '',
          detailsSentStatus: false,
          rateFinalized: false,
          invoiceStatus: false,
        }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData(prev => ({
        ...prev,
        propertyId: prev.propertyId || '',
        brandId: prev.brandId || '',
        proposalSender: prev.proposalSender || '',
      }));
    }
  }, [initialData, properties, brands, sidvinTeamMembers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value, type, checked } = e.target as HTMLInputElement; // Cast for checkbox handling
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const propertyOptions = properties.map(p => ({ value: p.id, label: `${p.address} (Area: ${p.proposedArea || 'N/A'} sqft)` }));
  const brandOptions = brands.map(b => ({ value: b.id, label: b.name }));
  const proposalSenderOptions = sidvinTeamMembers.map(member => ({
    value: member.name,
    label: `${member.name} (${member.designation})`,
  }));
  const senderExistsInOptions = proposalSenderOptions.some(option => option.value === formData.proposalSender);
  const proposalSenderOptionsWithFallback = !senderExistsInOptions && formData.proposalSender
    ? [{ value: formData.proposalSender, label: `${formData.proposalSender} (Existing)` }, ...proposalSenderOptions]
    : proposalSenderOptions;

  // Disable "Rate Finalized" if no visits are completed, unless it was already finalized.
  const isRateFinalizedDisabled = !hasCompletedVisits && !initialData?.rateFinalized;

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {initialData ? 'Edit Proposal' : 'Add New Proposal'}
      </h2>

      {propertyOptions.length > 0 ? (
        <SelectInput
          id="propertyId"
          label="Property"
          options={propertyOptions}
          value={formData.propertyId}
          onChange={handleChange}
          required
          placeholder="Select Property"
        />
      ) : (
        <p className="text-red-500 text-sm mb-4">No properties available. Please add some in the "Properties" tab.</p>
      )}

      {brandOptions.length > 0 ? (
        <SelectInput
          id="brandId"
          label="Brand"
          options={brandOptions}
          value={formData.brandId}
          onChange={handleChange}
          required
          placeholder="Select Brand"
        />
      ) : (
        <p className="text-red-500 text-sm mb-4">No brands available. Please add some in the "Brands" tab.</p>
      )}

      <DateInput id="proposalDate" label="Proposal Date" value={formData.proposalDate || ''} onChange={handleChange} required />
      {proposalSenderOptionsWithFallback.length > 0 ? (
        <SelectInput
          id="proposalSender"
          label="Proposal Sender"
          options={proposalSenderOptionsWithFallback}
          value={formData.proposalSender}
          onChange={handleChange}
          required
          placeholder="Select Proposal Sender"
        />
      ) : (
        <p className="text-red-500 text-sm mb-4">No Sidvin Team Members available. Please add team members first.</p>
      )}

      <LongTextInput id="brandRemarks" label="Brand Remarks" value={formData.brandRemarks} onChange={handleChange} />
      <LongTextInput
        id="specificDetailsRequiredByBrand"
        label="Specific Details Required by Brand"
        value={formData.specificDetailsRequiredByBrand}
        onChange={handleChange}
      />
      <CheckboxInput
        id="detailsSentStatus"
        label="Details Sent Status"
        checked={formData.detailsSentStatus}
        onChange={handleChange}
      />
      <CheckboxInput
        id="rateFinalized"
        label="Rate Finalized"
        checked={formData.rateFinalized}
        onChange={handleChange}
        disabled={isRateFinalizedDisabled}
        className={isRateFinalizedDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        title={isRateFinalizedDisabled ? 'Rate can only be finalized after at least one visit is completed.' : 'Finalize rate for this proposal.'}
      />
      {isRateFinalizedDisabled && (
        <p className="text-red-500 text-xs mt-[-10px] mb-4">Rate can only be finalized after at least one visit is completed.</p>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Proposal' : 'Add Proposal'}
        </Button>
      </div>
    </form>
  );
};

export default ProposalForm;

