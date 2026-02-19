import React, { useState, useEffect } from 'react';
import { TermSheetAgreement } from '../../types';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import LongTextInput from '../common/LongTextInput';
import Button from '../common/Button';

interface TermSheetAgreementFormProps {
  proposalId: string;
  initialData?: TermSheetAgreement;
  onSubmit: (termSheet: Omit<TermSheetAgreement, 'agreementDate' | 'agreementRegistrationDate' | 'storeOpeningDate'>) => void;
  onCancel: () => void;
}

const TermSheetAgreementForm: React.FC<TermSheetAgreementFormProps> = ({ proposalId, initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Omit<TermSheetAgreement, 'agreementDate' | 'agreementRegistrationDate' | 'storeOpeningDate'>>(
    initialData
      ? { ...initialData }
      : {
          proposalId: proposalId,
          specificTerms: '',
          handoverDate: null,
          rentFreePeriodDays: null,
          rentCommencementDate: null,
          plannedOpeningDate: null,
          loiTermSheetDate: null,
          advancePlan: '',
          ac: '',
          fireFightingSystem: '',
          flooring: '',
          lift: '',
          internalWalls: '',
          toilets: '',
          storeFront: '',
          glassFacadeGlazing: '',
          electricalPanel: '',
          powerLoad: '',
          dgBackup: '',
        }
  );

  useEffect(() => {
    if (initialData) {
      // Ensure existing agreement/store opening dates are not overwritten if not present in initialData.
      // We will only copy the fields that this form manages.
      setFormData({
        proposalId: initialData.proposalId,
        specificTerms: initialData.specificTerms,
        handoverDate: initialData.handoverDate,
        rentFreePeriodDays: initialData.rentFreePeriodDays,
        rentCommencementDate: initialData.rentCommencementDate,
        plannedOpeningDate: initialData.plannedOpeningDate,
        loiTermSheetDate: initialData.loiTermSheetDate,
        advancePlan: initialData.advancePlan,
        ac: initialData.ac,
        fireFightingSystem: initialData.fireFightingSystem,
        flooring: initialData.flooring,
        lift: initialData.lift,
        internalWalls: initialData.internalWalls,
        toilets: initialData.toilets,
        storeFront: initialData.storeFront,
        glassFacadeGlazing: initialData.glassFacadeGlazing,
        electricalPanel: initialData.electricalPanel,
        powerLoad: initialData.powerLoad,
        dgBackup: initialData.dgBackup,
      });
    } else {
      setFormData(prev => ({ ...prev, proposalId: proposalId }));
    }
  }, [initialData, proposalId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? (value === '' ? null : parseFloat(value)) : value, // Handle empty string for numbers
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {initialData ? 'Edit Term Sheet Details' : 'Add New Term Sheet'}
      </h2>
      <p className="text-sm text-gray-600 mb-4">For Proposal ID: {proposalId.substring(0, 8)}...</p>

      <LongTextInput id="specificTerms" label="Specific Terms" value={formData.specificTerms} onChange={handleChange} />
      <Input id="advancePlan" label="Advance Plan" value={formData.advancePlan} onChange={handleChange} />
      <DateInput id="handoverDate" label="Handover Date" value={formData.handoverDate || ''} onChange={handleChange} />
      <Input
        id="rentFreePeriodDays"
        label="Rent Free Period (Days)"
        value={formData.rentFreePeriodDays} // Use value directly, Input component handles null to ''
        onChange={handleChange}
        type="number"
        min="0"
      />
      <DateInput id="rentCommencementDate" label="Rent Commencement Date" value={formData.rentCommencementDate || ''} onChange={handleChange} />
      <DateInput id="plannedOpeningDate" label="Planned Opening Date" value={formData.plannedOpeningDate || ''} onChange={handleChange} />
      <DateInput id="loiTermSheetDate" label="LOI/Term Sheet Date" value={formData.loiTermSheetDate || ''} onChange={handleChange} />

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Property Facilities</h3>
      <Input id="ac" label="Air Conditioning (AC)" value={formData.ac} onChange={handleChange} />
      <Input id="fireFightingSystem" label="Fire Fighting System" value={formData.fireFightingSystem} onChange={handleChange} />
      <Input id="flooring" label="Flooring" value={formData.flooring} onChange={handleChange} />
      <Input id="lift" label="Lift" value={formData.lift} onChange={handleChange} />
      <Input id="internalWalls" label="Internal Walls" value={formData.internalWalls} onChange={handleChange} />
      <Input id="toilets" label="Toilets" value={formData.toilets} onChange={handleChange} />
      <Input id="storeFront" label="Store Front" value={formData.storeFront} onChange={handleChange} />
      <Input id="glassFacadeGlazing" label="Glass Façade / Glazing" value={formData.glassFacadeGlazing} onChange={handleChange} />
      <Input id="electricalPanel" label="Electrical Panel" value={formData.electricalPanel} onChange={handleChange} />
      <Input id="powerLoad" label="Power Load" value={formData.powerLoad} onChange={handleChange} />
      <Input id="dgBackup" label="DG Backup" value={formData.dgBackup} onChange={handleChange} />


      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Term Sheet' : 'Add Term Sheet'}
        </Button>
      </div>
    </form>
  );
};

export default TermSheetAgreementForm;
