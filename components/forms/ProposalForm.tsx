import React, { useState, useEffect } from 'react';
import { Proposal, Property, Brand } from '../../types';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import LongTextInput from '../common/LongTextInput';
import CheckboxInput from '../common/CheckboxInput';
import SelectInput from '../common/SelectInput';
import Button from '../common/Button';

interface ProposalFormProps {
  initialData?: Proposal;
  properties: Property[];
  brands: Brand[];
  hasCompletedVisits: boolean; // New prop
  onSubmit: (proposal: Omit<Proposal, 'id' | 'currentStage'>) => void;
  onCancel: () => void;
}

const ProposalForm: React.FC<ProposalFormProps> = ({ initialData, properties, brands, hasCompletedVisits, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Proposal, 'id' | 'currentStage'>>(
    initialData
      ? { ...initialData }
      : {
          propertyId: properties[0]?.id || '',
          brandId: brands[0]?.id || '',
          proposalDate: null,
          proposalSender: '',
          // nextFollowUpDate: null, // Removed
          brandRemarks: '',
          specificDetailsRequiredByBrand: '',
          detailsSentStatus: false,
          rateFinalized: false,
        }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      // Set initial values for new proposal if properties/brands available
      setFormData(prev => ({
        ...prev,
        propertyId: properties[0]?.id || '',
        brandId: brands[0]?.id || '',
      }));
    }
  }, [initialData, properties, brands]);

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

  // Disable "Rate Finalized" if no visits are completed, unless it was already finalized.
  const isRateFinalizedDisabled = !hasCompletedVisits && !initialData?.rateFinalized;

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto">
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

      <DateInput id="proposalDate" label="Proposal Date" value={formData.proposalDate || ''} onChange={handleChange} />
      <Input id="proposalSender" label="Proposal Sender" value={formData.proposalSender} onChange={handleChange} required />
      {/* Removed Next Follow Up Date input */}
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