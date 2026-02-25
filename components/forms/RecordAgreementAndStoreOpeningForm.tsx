import React, { useEffect, useState } from 'react';
import { TermSheetAgreement } from '../../types';
import DateInput from '../common/DateInput';
import Input from '../common/Input';
import Button from '../common/Button';

interface RecordAgreementAndStoreOpeningFormProps {
  proposalId: string;
  initialData?: TermSheetAgreement;
  onSubmit: (
    proposalId: string,
    agreementDate: string | null,
    agreementRegistrationDate: string | null,
    storeOpeningDate: string | null
  ) => void;
  onCancel: () => void;
  currentUserName: string;
}

const RecordAgreementAndStoreOpeningForm: React.FC<RecordAgreementAndStoreOpeningFormProps> = ({ proposalId, initialData, onSubmit, onCancel, currentUserName }) => {
  const [agreementDate, setAgreementDate] = useState<string | null>(initialData?.agreementDate || null);
  const [agreementRegistrationDate, setAgreementRegistrationDate] = useState<string | null>(initialData?.agreementRegistrationDate || null);
  const [storeOpeningDate, setStoreOpeningDate] = useState<string | null>(initialData?.storeOpeningDate || null);

  useEffect(() => {
    if (initialData) {
      setAgreementDate(initialData.agreementDate || null);
      setAgreementRegistrationDate(initialData.agreementRegistrationDate || null);
      setStoreOpeningDate(initialData.storeOpeningDate || null);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(proposalId, agreementDate, agreementRegistrationDate, storeOpeningDate);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Record Agreement and Store Opening</h2>
        <Button type="button" variant="secondary" onClick={onCancel}>Back</Button>
      </div>

      <DateInput id="agreementRegistrationDate" label="Agreement Registration Date" value={agreementRegistrationDate || ''} onChange={(e) => setAgreementRegistrationDate(e.target.value || null)} />
      {agreementRegistrationDate && (
        <DateInput id="agreementDate" label="Agreement Date" value={agreementDate || ''} onChange={(e) => setAgreementDate(e.target.value || null)} />
      )}
      <DateInput id="storeOpeningDate" label="Store Opening Date" value={storeOpeningDate || ''} onChange={(e) => setStoreOpeningDate(e.target.value || null)} />
      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Dates</Button>
      </div>
    </form>
  );
};

export default RecordAgreementAndStoreOpeningForm;
