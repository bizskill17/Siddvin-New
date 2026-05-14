import React, { useState, useEffect } from 'react';
import { TermSheetAgreement } from '../../types';
import DateInput from '../common/DateInput';
import Button from '../common/Button';

interface RecordAgreementFormProps {
  proposalId: string;
  initialData?: TermSheetAgreement;
  onSubmit: (proposalId: string, agreementDate: string | null, agreementRegistrationDate: string | null) => void;
  onCancel: () => void;
}

const RecordAgreementForm: React.FC<RecordAgreementFormProps> = ({ proposalId, initialData, onSubmit, onCancel }) => {
  const [agreementDate, setAgreementDate] = useState<string | null>(initialData?.agreementDate || null);
  const [agreementRegistrationDate, setAgreementRegistrationDate] = useState<string | null>(initialData?.agreementRegistrationDate || null);

  useEffect(() => {
    if (initialData) {
      setAgreementDate(initialData.agreementDate || null);
      setAgreementRegistrationDate(initialData.agreementRegistrationDate || null);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(proposalId, agreementDate, agreementRegistrationDate);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Record Agreement Dates</h2>`r`n
      <DateInput
        id="agreementDate"
        label="Agreement Date"
        value={agreementDate || ''}
        onChange={(e) => setAgreementDate(e.target.value || null)}
      />
      <DateInput
        id="agreementRegistrationDate"
        label="Agreement Registration Date"
        value={agreementRegistrationDate || ''}
        onChange={(e) => setAgreementRegistrationDate(e.target.value || null)}
      />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Record Dates
        </Button>
      </div>
    </form>
  );
};

export default RecordAgreementForm;

