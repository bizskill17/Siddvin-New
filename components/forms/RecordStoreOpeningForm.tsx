import React, { useState, useEffect } from 'react';
import { TermSheetAgreement } from '../../types';
import DateInput from '../common/DateInput';
import Button from '../common/Button';

interface RecordStoreOpeningFormProps {
  proposalId: string;
  initialData?: TermSheetAgreement;
  onSubmit: (proposalId: string, storeOpeningDate: string | null) => void;
  onCancel: () => void;
}

const RecordStoreOpeningForm: React.FC<RecordStoreOpeningFormProps> = ({ proposalId, initialData, onSubmit, onCancel }) => {
  const [storeOpeningDate, setStoreOpeningDate] = useState<string | null>(initialData?.storeOpeningDate || null);

  useEffect(() => {
    if (initialData) {
      setStoreOpeningDate(initialData.storeOpeningDate || null);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(proposalId, storeOpeningDate);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Record Store Opening Date</h2>
      <p className="text-sm text-gray-600 mb-4">For Proposal ID: {proposalId.substring(0, 8)}...</p>

      <DateInput
        id="storeOpeningDate"
        label="Store Opening Date"
        value={storeOpeningDate || ''}
        onChange={(e) => setStoreOpeningDate(e.target.value || null)}
      />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Record Date
        </Button>
      </div>
    </form>
  );
};

export default RecordStoreOpeningForm;
