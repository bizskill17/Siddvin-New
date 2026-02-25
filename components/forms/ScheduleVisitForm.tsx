import React, { useState } from 'react';
import { Visit } from '../../types';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import Button from '../common/Button';

interface ScheduleVisitFormProps {
  proposalId: string;
  onSubmit: (visit: Omit<Visit, 'id' | 'visitDate' | 'visitOutcome' | 'developerAttendees' | 'brandAttendees' | 'sidvinAttendees' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => void;
  onCancel: () => void;
  currentUserName: string;
}

const ScheduleVisitForm: React.FC<ScheduleVisitFormProps> = ({ proposalId, onSubmit, onCancel, currentUserName }) => {
  const [formData, setFormData] = useState<Omit<Visit, 'id' | 'visitDate' | 'visitOutcome' | 'developerAttendees' | 'brandAttendees' | 'sidvinAttendees' | 'createdAt' | 'updatedAt' | 'updatedBy'>>({
    proposalId,
    scheduledDate: null,
    scheduledTime: null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Schedule New Visit</h2>
        <Button type="button" variant="secondary" onClick={onCancel}>Back</Button>
      </div>

      <DateInput id="scheduledDate" label="Scheduled Date" value={formData.scheduledDate || ''} onChange={handleChange} required />
      <Input id="scheduledTime" label="Scheduled Time" value={formData.scheduledTime || ''} onChange={handleChange} type="time" />
      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Schedule Visit</Button>
      </div>
    </form>
  );
};

export default ScheduleVisitForm;
