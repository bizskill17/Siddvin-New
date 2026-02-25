import React, { useState, useEffect } from 'react';
import { DepositStage, TermSheetAgreement } from '../../types';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import LongTextInput from '../common/LongTextInput';
import CheckboxInput from '../common/CheckboxInput';
import Button from '../common/Button';

interface TermSheetAgreementFormProps {
  proposalId: string;
  initialData?: TermSheetAgreement;
  onSubmit: (termSheet: Omit<TermSheetAgreement, 'agreementDate' | 'storeOpeningDate' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => void;
  onCancel: () => void;
  currentUserName: string;
}

const createDepositStage = (index: number): DepositStage => ({
  id: Math.random().toString(36).substring(2, 9),
  stageName: `Stage ${index}`,
  amount: null,
  received: false,
});

const TermSheetAgreementForm: React.FC<TermSheetAgreementFormProps> = ({ proposalId, initialData, onSubmit, onCancel, currentUserName }) => {
  const [formData, setFormData] = useState<Omit<TermSheetAgreement, 'agreementDate' | 'storeOpeningDate' | 'createdAt' | 'updatedAt' | 'updatedBy'>>(
    initialData
      ? {
          proposalId: initialData.proposalId,
          specificTerms: initialData.specificTerms,
          handoverDate: initialData.handoverDate,
          rentFreePeriodDays: initialData.rentFreePeriodDays,
          rentCommencementDate: initialData.rentCommencementDate,
          plannedOpeningDate: initialData.plannedOpeningDate,
          preparationDate: initialData.preparationDate,
          finalizationDate: initialData.finalizationDate,
          signingDate: initialData.signingDate,
          advancePlan: initialData.advancePlan,
          agreementRegistrationRequired: initialData.agreementRegistrationRequired,
          agreementRegistrationDate: initialData.agreementRegistrationDate,
          registrationFeePropertyShare: initialData.registrationFeePropertyShare,
          registrationFeeBrandShare: initialData.registrationFeeBrandShare,
          depositStages: initialData.depositStages || [],
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
        }
      : {
          proposalId,
          specificTerms: '',
          handoverDate: null,
          rentFreePeriodDays: null,
          rentCommencementDate: null,
          plannedOpeningDate: null,
          preparationDate: null,
          finalizationDate: null,
          signingDate: null,
          advancePlan: '',
          agreementRegistrationRequired: false,
          agreementRegistrationDate: null,
          registrationFeePropertyShare: null,
          registrationFeeBrandShare: null,
          depositStages: [createDepositStage(1)],
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
      setFormData({
        proposalId: initialData.proposalId,
        specificTerms: initialData.specificTerms,
        handoverDate: initialData.handoverDate,
        rentFreePeriodDays: initialData.rentFreePeriodDays,
        rentCommencementDate: initialData.rentCommencementDate,
        plannedOpeningDate: initialData.plannedOpeningDate,
        preparationDate: initialData.preparationDate,
        finalizationDate: initialData.finalizationDate,
        signingDate: initialData.signingDate,
        advancePlan: initialData.advancePlan,
        agreementRegistrationRequired: initialData.agreementRegistrationRequired,
        agreementRegistrationDate: initialData.agreementRegistrationDate,
        registrationFeePropertyShare: initialData.registrationFeePropertyShare,
        registrationFeeBrandShare: initialData.registrationFeeBrandShare,
        depositStages: initialData.depositStages?.length ? initialData.depositStages : [createDepositStage(1)],
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
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : (['rentFreePeriodDays', 'registrationFeePropertyShare', 'registrationFeeBrandShare'].includes(id) ? (value === '' ? null : parseFloat(value)) : value),
    }));
  };

  const handleDepositChange = (index: number, field: keyof DepositStage, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      depositStages: prev.depositStages.map((stage, i) => {
        if (i !== index) return stage;
        if (field === 'amount') {
          return { ...stage, amount: value === '' ? null : Number(value) };
        }
        return { ...stage, [field]: value };
      }),
    }));
  };

  const addDepositStage = () => {
    setFormData((prev) => ({
      ...prev,
      depositStages: [...prev.depositStages, createDepositStage(prev.depositStages.length + 1)],
    }));
  };

  const removeDepositStage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      depositStages: prev.depositStages.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit Terms' : 'Add Terms'}</h2>
        <Button type="button" variant="secondary" onClick={onCancel}>Back</Button>
      </div>

      <LongTextInput id="specificTerms" label="Terms" value={formData.specificTerms} onChange={handleChange} />
      <DateInput id="finalizationDate" label="Finalization Date" value={formData.finalizationDate || ''} onChange={handleChange} />
      <DateInput id="preparationDate" label="Preparation Date" value={formData.preparationDate || ''} onChange={handleChange} />
      <DateInput id="signingDate" label="Signing Date" value={formData.signingDate || ''} onChange={handleChange} />
      <Input id="advancePlan" label="Advance Plan" value={formData.advancePlan} onChange={handleChange} />

      <CheckboxInput
        id="agreementRegistrationRequired"
        label="Agreement Registration Required"
        checked={formData.agreementRegistrationRequired}
        onChange={handleChange}
      />

      {formData.agreementRegistrationRequired && (
        <>
          <Input id="registrationFeePropertyShare" label="Registration Fee Proportion - Property Share (%)" value={formData.registrationFeePropertyShare} onChange={handleChange} type="number" min="0" max="100" />
          <Input id="registrationFeeBrandShare" label="Registration Fee Proportion - Brand Share (%)" value={formData.registrationFeeBrandShare} onChange={handleChange} type="number" min="0" max="100" />
        </>
      )}

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Deposit Stages</h3>
      {formData.depositStages.map((stage, index) => {
        const prevAmountFilled = index === 0 || formData.depositStages[index - 1].amount !== null;
        const stageOpened = stage.stageName.trim() !== '' || stage.amount !== null || stage.received;
        return (
        <div key={stage.id} className="p-4 border border-gray-200 rounded-md mb-4">
          <Input
            id={`stageName-${stage.id}`}
            label={`Stage ${index + 1} Name`}
            value={stage.stageName}
            onChange={(e) => handleDepositChange(index, 'stageName', e.target.value)}
            disabled={!prevAmountFilled}
          />
          <Input
            id={`stageAmount-${stage.id}`}
            label="Deposit Amount"
            value={stage.amount}
            onChange={(e) => handleDepositChange(index, 'amount', e.target.value)}
            type="number"
            min="0"
            required={stageOpened}
            disabled={!prevAmountFilled}
          />
          <CheckboxInput
            id={`stageReceived-${stage.id}`}
            label={`${stage.stageName || `Stage ${index + 1}`} Deposit Received`}
            checked={stage.received}
            onChange={(e) => handleDepositChange(index, 'received', e.target.checked)}
            disabled={!prevAmountFilled || stage.amount === null}
          />
          {formData.depositStages.length > 1 && (
            <Button type="button" variant="danger" size="sm" onClick={() => removeDepositStage(index)}>Remove Stage</Button>
          )}
        </div>
      )})}
      <Button type="button" variant="secondary" onClick={addDepositStage} className="mb-6">Add Deposit Stage</Button>

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Property Facilities</h3>
      <Input id="ac" label="Air Conditioning (AC)" value={formData.ac} onChange={handleChange} />
      <Input id="fireFightingSystem" label="Fire Fighting System" value={formData.fireFightingSystem} onChange={handleChange} />
      <Input id="flooring" label="Flooring" value={formData.flooring} onChange={handleChange} />
      <Input id="lift" label="Lift" value={formData.lift} onChange={handleChange} />
      <Input id="internalWalls" label="Internal Walls" value={formData.internalWalls} onChange={handleChange} />
      <Input id="toilets" label="Toilets" value={formData.toilets} onChange={handleChange} />
      <Input id="storeFront" label="Store Front" value={formData.storeFront} onChange={handleChange} />
      <Input id="glassFacadeGlazing" label="Glass Facade / Glazing" value={formData.glassFacadeGlazing} onChange={handleChange} />
      <Input id="electricalPanel" label="Electrical Panel" value={formData.electricalPanel} onChange={handleChange} />
      <Input id="powerLoad" label="Power Load" value={formData.powerLoad} onChange={handleChange} />
      <Input id="dgBackup" label="DG Backup" value={formData.dgBackup} onChange={handleChange} />

      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Terms' : 'Add Terms'}</Button>
      </div>
    </form>
  );
};

export default TermSheetAgreementForm;
