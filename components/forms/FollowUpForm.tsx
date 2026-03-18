import React, { useEffect, useState } from 'react';
import { FollowUp } from '../../types';
import DateInput from '../common/DateInput';
import LongTextInput from '../common/LongTextInput';
import SelectInput from '../common/SelectInput';
import Input from '../common/Input';
import Button from '../common/Button';

interface FollowUpFormProps {
  proposalId: string;
  initialData?: FollowUp;
  onSubmit: (followUp: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>, actionToTake?: 'scheduleVisit') => void;
  onCancel: () => void;
  currentUserName: string;
}

type FollowUpFormData = Omit<FollowUp, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'updatedBy'> & {
  status: FollowUp['status'] | '';
};

const FollowUpForm: React.FC<FollowUpFormProps> = ({ proposalId, initialData, onSubmit, onCancel, currentUserName }) => {
  const [formData, setFormData] = useState<FollowUpFormData>(
    initialData
      ? {
          proposalId: initialData.proposalId,
          followUpDate: initialData.followUpDate,
          remarks: initialData.remarks,
          status: initialData.status,
          nextFollowUpDate: initialData.nextFollowUpDate,
          nextFollowUpTime: initialData.nextFollowUpTime,
          plannedVisitDate: initialData.plannedVisitDate,
          cancelRemarks: initialData.cancelRemarks,
        }
      : {
          proposalId,
          followUpDate: null,
          remarks: '',
          status: '',
          nextFollowUpDate: null,
          nextFollowUpTime: null,
          plannedVisitDate: null,
          cancelRemarks: null,
        }
  );
  const [actionToTake, setActionToTake] = useState<'scheduleVisit' | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        proposalId: initialData.proposalId,
        followUpDate: initialData.followUpDate,
        remarks: initialData.remarks,
        status: initialData.status,
        nextFollowUpDate: initialData.nextFollowUpDate,
        nextFollowUpTime: initialData.nextFollowUpTime,
        plannedVisitDate: initialData.plannedVisitDate,
        cancelRemarks: initialData.cancelRemarks,
      });
      setActionToTake(initialData.status === 'Schedule Visit' ? 'scheduleVisit' : null);
    } else {
      setFormData((prev) => ({ ...prev, proposalId }));
      setActionToTake(null);
    }
  }, [initialData, proposalId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStatus = e.target.value as FollowUpFormData['status'];
    setFormData((prev) => ({
      ...prev,
      status: selectedStatus,
      nextFollowUpDate: selectedStatus === 'Follow Up Again' || selectedStatus === 'Pending Details & Documentation' ? prev.nextFollowUpDate : null,
      nextFollowUpTime: selectedStatus === 'Follow Up Again' ? prev.nextFollowUpTime : null,
      plannedVisitDate: null,
      cancelRemarks: selectedStatus === 'Cancel Proposal' ? prev.cancelRemarks : null,
    }));
    setActionToTake(selectedStatus === 'Schedule Visit' ? 'scheduleVisit' : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.status) return;
    if ((formData.status === 'Follow Up Again' || formData.status === 'Pending Details & Documentation') && !formData.nextFollowUpDate) return;
    if (formData.status === 'Cancel Proposal' && !formData.cancelRemarks?.trim()) return;

    onSubmit(formData as Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>, actionToTake || undefined);
  };

  const statusOptions = [
    { value: 'Follow Up Again', label: 'Follow Up Again' },
    { value: 'Pending Details & Documentation', label: 'Pending Details & Documentation' },
    { value: 'Schedule Visit', label: 'Schedule Visit' },
    { value: 'Cancel Proposal', label: 'Cancel Proposal' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit Follow Up' : 'Add New Follow Up'}</h2>
        <Button type="button" variant="primary" onClick={onCancel}>Back</Button>
      </div>

      <DateInput id="followUpDate" label="Follow Up Date" value={formData.followUpDate || ''} onChange={handleChange} required />
      <LongTextInput id="remarks" label="Remarks" value={formData.remarks} onChange={handleChange} />

      <SelectInput id="status" label="Status" options={statusOptions} value={formData.status} onChange={handleStatusChange} required placeholder="Select Status" />

      {(formData.status === 'Follow Up Again' || formData.status === 'Pending Details & Documentation') && (
        <DateInput id="nextFollowUpDate" label="Next Follow Up Date" value={formData.nextFollowUpDate || ''} onChange={handleChange} required />
      )}

      {formData.status === 'Follow Up Again' && (
        <Input id="nextFollowUpTime" label="Next Follow Up Time" value={formData.nextFollowUpTime || ''} onChange={handleChange} type="time" />
      )}

      {formData.status === 'Cancel Proposal' && (
        <LongTextInput id="cancelRemarks" label="Cancel Remarks" value={formData.cancelRemarks || ''} onChange={handleChange} required />
      )}

      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Follow Up' : 'Add Follow Up'}</Button>
      </div>
    </form>
  );
};

export default FollowUpForm;



