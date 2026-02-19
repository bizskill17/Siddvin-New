import React, { useEffect, useState } from 'react';
import { FollowUp } from '../../types';
import DateInput from '../common/DateInput';
import LongTextInput from '../common/LongTextInput';
import SelectInput from '../common/SelectInput';
import Button from '../common/Button';

interface FollowUpFormProps {
  proposalId: string;
  initialData?: FollowUp;
  onSubmit: (followUp: Omit<FollowUp, 'id'>, actionToTake?: 'scheduleVisit') => void;
  onCancel: () => void;
}

type FollowUpFormData = Omit<FollowUp, 'id' | 'status'> & {
  status: FollowUp['status'] | '';
};

const FollowUpForm: React.FC<FollowUpFormProps> = ({ proposalId, initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<FollowUpFormData>(
    initialData
      ? { ...initialData }
      : {
          proposalId,
          followUpDate: null,
          remarks: '',
          status: '',
          nextFollowUpDate: null,
          plannedVisitDate: null,
          cancelRemarks: null,
        }
  );
  const [actionToTake, setActionToTake] = useState<'scheduleVisit' | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
      setActionToTake(initialData.status === 'Schedule Visit' ? 'scheduleVisit' : null);
    } else {
      setFormData((prev) => ({ ...prev, proposalId }));
      setActionToTake(null);
    }
  }, [initialData, proposalId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStatus = e.target.value as FollowUpFormData['status'];
    setFormData((prev) => ({
      ...prev,
      status: selectedStatus,
      nextFollowUpDate: selectedStatus === 'Follow Up Again' ? prev.nextFollowUpDate : null,
      plannedVisitDate: null,
      cancelRemarks: selectedStatus === 'Cancel Proposal' ? prev.cancelRemarks : null,
    }));
    setActionToTake(selectedStatus === 'Schedule Visit' ? 'scheduleVisit' : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.status) return;
    if (formData.status === 'Follow Up Again' && !formData.nextFollowUpDate) return;
    if (formData.status === 'Cancel Proposal' && !formData.cancelRemarks?.trim()) return;

    onSubmit(formData as Omit<FollowUp, 'id'>, actionToTake || undefined);
  };

  const statusOptions = [
    { value: 'Follow Up Again', label: 'Follow Up Again' },
    { value: 'Schedule Visit', label: 'Schedule Visit' },
    { value: 'Cancel Proposal', label: 'Cancel Proposal' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {initialData ? 'Edit Follow Up' : 'Add New Follow Up'}
      </h2>
      <p className="text-sm text-gray-600 mb-4">For Proposal ID: {proposalId.substring(0, 8)}...</p>

      <DateInput id="followUpDate" label="Follow Up Date" value={formData.followUpDate || ''} onChange={handleChange} required />
      <LongTextInput id="remarks" label="Remarks" value={formData.remarks} onChange={handleChange} />

      <SelectInput
        id="status"
        label="Status"
        options={statusOptions}
        value={formData.status}
        onChange={handleStatusChange}
        required
        placeholder="Select Status"
      />

      {formData.status === 'Follow Up Again' && (
        <DateInput
          id="nextFollowUpDate"
          label="Next Follow Up Date"
          value={formData.nextFollowUpDate || ''}
          onChange={handleChange}
          required
        />
      )}

      {formData.status === 'Cancel Proposal' && (
        <LongTextInput
          id="cancelRemarks"
          label="Cancel Remarks"
          value={formData.cancelRemarks || ''}
          onChange={handleChange}
          required
        />
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Follow Up' : 'Add Follow Up'}
        </Button>
      </div>
    </form>
  );
};

export default FollowUpForm;

