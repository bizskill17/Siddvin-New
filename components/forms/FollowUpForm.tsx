import React, { useState, useEffect } from 'react';
import { FollowUp } from '../../types';
import Input from '../common/Input';
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

const FollowUpForm: React.FC<FollowUpFormProps> = ({ proposalId, initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Omit<FollowUp, 'id'>>(
    initialData
      ? { ...initialData }
      : {
          proposalId: proposalId,
          followUpDate: null,
          remarks: '',
          status: 'Scheduled',
          actionTaken: null,
        }
  );
  const [actionToTake, setActionToTake] = useState<'scheduleVisit' | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData(prev => ({ ...prev, proposalId: proposalId }));
    }
  }, [initialData, proposalId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    if (id === 'actionTaken' && value === 'Visit Scheduled') {
      setActionToTake('scheduleVisit');
    } else if (id === 'actionTaken' && value === 'Followed Up') {
      // If "Followed Up", set status to Completed
      setFormData(prev => ({ ...prev, status: 'Completed' }));
      setActionToTake(null);
    } else if (id === 'actionTaken' && value === 'None') {
      setActionToTake(null);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, status: value as 'Scheduled' | 'Completed' | 'Canceled' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, actionToTake || undefined);
  };

  const statusOptions = [
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Canceled', label: 'Canceled' },
  ];

  const actionTakenOptions = [
    { value: 'None', label: 'None' },
    { value: 'Followed Up', label: 'Followed Up (Mark as Completed)' },
    { value: 'Visit Scheduled', label: 'Schedule Visit' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto">
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
      />

      {/* Action Taken is only relevant for existing or completed follow-ups */}
      {formData.status === 'Completed' && (
        <SelectInput
          id="actionTaken"
          label="Action Taken"
          options={actionTakenOptions}
          value={formData.actionTaken || 'None'}
          onChange={handleChange}
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