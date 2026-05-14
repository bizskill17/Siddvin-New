import React, { useEffect, useState } from 'react';
import { TermSheetAgreement } from '../../types';
import DateInput from '../common/DateInput';
import Input from '../common/Input';
import LongTextInput from '../common/LongTextInput';
import Button from '../common/Button';

interface RecordAgreementAndStoreOpeningFormProps {
  proposalId: string;
  initialData?: TermSheetAgreement;
  onSubmit: (proposalId: string, data: {
    leaseAgreementPrepared: string | null;
    leaseAgreementRemarks: string;
    leaseAgreementSigned: string | null;
    leaseAgreementRegistered: string | null;
    storeOpeningDate: string | null;
  }) => void;
  onCancel: () => void;
  currentUserName: string;
}

const RecordAgreementAndStoreOpeningForm: React.FC<RecordAgreementAndStoreOpeningFormProps> = ({ proposalId, initialData, onSubmit, onCancel, currentUserName }) => {
  const [leaseAgreementPrepared, setLeaseAgreementPrepared] = useState<string | null>(initialData?.preparationDate || null);
  const [leaseAgreementRemarks, setLeaseAgreementRemarks] = useState(initialData?.leaseAgreementRemarks || '');
  const [leaseAgreementSigned, setLeaseAgreementSigned] = useState<string | null>(initialData?.signingDate || null);
  const [leaseAgreementRegistered, setLeaseAgreementRegistered] = useState<string | null>(initialData?.agreementRegistrationDate || null);
  const [storeOpeningDate, setStoreOpeningDate] = useState<string | null>(initialData?.storeOpeningDate || null);

  useEffect(() => {
    if (initialData) {
      setLeaseAgreementPrepared(initialData.preparationDate || null);
      setLeaseAgreementRemarks(initialData.leaseAgreementRemarks || '');
      setLeaseAgreementSigned(initialData.signingDate || null);
      setLeaseAgreementRegistered(initialData.agreementRegistrationDate || null);
      setStoreOpeningDate(initialData.storeOpeningDate || null);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(proposalId, {
      leaseAgreementPrepared,
      leaseAgreementRemarks,
      leaseAgreementSigned,
      leaseAgreementRegistered,
      storeOpeningDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Record Agreement and Store Opening</h2>
        <Button type="button" variant="primary" onClick={onCancel}>Back</Button>
      </div>

      <LongTextInput id="leaseAgreementRemarks" label="Lease Agreement Remarks" value={leaseAgreementRemarks} onChange={(e) => setLeaseAgreementRemarks(e.target.value)} />
      <DateInput id="leaseAgreementRegistered" label="Lease Agreement Registered" value={leaseAgreementRegistered || ''} onChange={(e) => setLeaseAgreementRegistered(e.target.value || null)} />
      <DateInput id="storeOpeningDate" label="Store Opening Date" value={storeOpeningDate || ''} onChange={(e) => setStoreOpeningDate(e.target.value || null)} />
      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Details</Button>
      </div>
    </form>
  );
};

export default RecordAgreementAndStoreOpeningForm;



