import React, { useState, useEffect } from 'react';
import { Proposal, Property, Brand, SidvinTeamMember, CurrentStageEnum } from '../../types';
import DateInput from '../common/DateInput';
import LongTextInput from '../common/LongTextInput';
import SelectInput from '../common/SelectInput';
import Input from '../common/Input';
import Button from '../common/Button';

interface ProposalFormProps {
  initialData?: Proposal;
  properties: Property[];
  brands: Brand[];
  sidvinTeamMembers: SidvinTeamMember[];
  onSubmit: (proposal: Omit<Proposal, 'id' | 'serialNo' | 'currentStage' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => void;
  onCancel: () => void;
  currentUserName: string;
}

const ProposalForm: React.FC<ProposalFormProps> = ({
  initialData,
  properties,
  brands,
  sidvinTeamMembers,
  onSubmit,
  onCancel,
  currentUserName,
}) => {
  const [formData, setFormData] = useState<Omit<Proposal, 'id' | 'serialNo' | 'currentStage' | 'createdAt' | 'updatedAt' | 'updatedBy'>>(
    initialData
      ? {
          propertyId: initialData.propertyId,
          brandId: initialData.brandId,
          proposalDate: initialData.proposalDate,
          proposalSender: initialData.proposalSender,
          brandRemarks: initialData.brandRemarks,
          invoiceStatus: initialData.invoiceStatus,
          invoiceNo: initialData.invoiceNo,
          invoiceDate: initialData.invoiceDate,
          invoiceAmount: initialData.invoiceAmount,
        }
      : {
          propertyId: '',
          brandId: '',
          proposalDate: null,
          proposalSender: '',
          brandRemarks: '',
          invoiceStatus: false,
          invoiceNo: '',
          invoiceDate: null,
          invoiceAmount: null,
        }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        propertyId: initialData.propertyId,
        brandId: initialData.brandId,
        proposalDate: initialData.proposalDate,
        proposalSender: initialData.proposalSender,
        brandRemarks: initialData.brandRemarks,
        invoiceStatus: initialData.invoiceStatus,
        invoiceNo: initialData.invoiceNo,
        invoiceDate: initialData.invoiceDate,
        invoiceAmount: initialData.invoiceAmount,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : (id === 'invoiceAmount' ? (value === '' ? null : Number(value)) : value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const billed = !!formData.invoiceNo && !!formData.invoiceDate && formData.invoiceAmount !== null;
    onSubmit({ ...formData, invoiceStatus: billed });
  };

  const propertyOptions = properties.map(p => ({ value: p.id, label: `P-${p.serialNo || '-'} ${p.address}` }));
  const brandOptions = brands.map(b => ({ value: b.id, label: `B-${b.serialNo || '-'} ${b.name}` }));
  const proposalSenderOptions = sidvinTeamMembers.map(member => ({
    value: member.name,
    label: `${member.name} (${member.designation})`,
  }));

  const showInvoiceFields =
    initialData?.currentStage === CurrentStageEnum.PendingBrandFees ||
    initialData?.currentStage === CurrentStageEnum.CompletedProposal ||
    !!formData.invoiceNo ||
    !!formData.invoiceDate ||
    formData.invoiceAmount !== null;

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit Proposal' : 'Add New Proposal'}</h2>
        <Button type="button" variant="secondary" onClick={onCancel}>Back</Button>
      </div>

      {propertyOptions.length > 0 ? (
        <SelectInput id="propertyId" label="Property" options={propertyOptions} value={formData.propertyId} onChange={handleChange} required placeholder="Select Property" />
      ) : (
        <p className="text-red-500 text-sm mb-4">No properties available. Please add a property first.</p>
      )}

      {brandOptions.length > 0 ? (
        <SelectInput id="brandId" label="Brand" options={brandOptions} value={formData.brandId} onChange={handleChange} required placeholder="Select Brand" />
      ) : (
        <p className="text-red-500 text-sm mb-4">No brands available. Please add a brand first.</p>
      )}

      <DateInput id="proposalDate" label="Proposal Date" value={formData.proposalDate || ''} onChange={handleChange} required />

      <SelectInput
        id="proposalSender"
        label="Proposal Sender"
        options={proposalSenderOptions}
        value={formData.proposalSender}
        onChange={handleChange}
        required
        placeholder="Select Proposal Sender"
      />

      <LongTextInput id="brandRemarks" label="Brand Remarks" value={formData.brandRemarks} onChange={handleChange} />

      {showInvoiceFields && (
        <>
          <hr className="my-6 border-gray-200" />
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Invoice</h3>
          <Input id="invoiceNo" label="Invoice No" value={formData.invoiceNo} onChange={handleChange} required />
          <DateInput id="invoiceDate" label="Invoice Date" value={formData.invoiceDate || ''} onChange={handleChange} required />
          <Input id="invoiceAmount" label="Invoice Amount" value={formData.invoiceAmount} onChange={handleChange} type="number" min="0" required />
        </>
      )}

      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Proposal' : 'Add Proposal'}</Button>
      </div>
    </form>
  );
};

export default ProposalForm;
