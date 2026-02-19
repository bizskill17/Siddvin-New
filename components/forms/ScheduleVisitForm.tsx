import React, { useState } from 'react';
import { Visit } from '../../types';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import Button from '../common/Button';

interface ScheduleVisitFormProps {
  proposalId: string;
  onSubmit: (visit: Omit<Visit, 'id' | 'visitDate' | 'visitOutcome' | 'developerAttendees' | 'brandAttendees' | 'sidvinAttendees'>) => void;
  onCancel: () => void;
}

const ScheduleVisitForm: React.FC<ScheduleVisitFormProps> = ({ proposalId, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Visit, 'id' | 'visitDate' | 'visitOutcome' | 'developerAttendees' | 'brandAttendees' | 'sidvinAttendees'>>(
    {
      proposalId: proposalId,
      scheduledDate: null,
      scheduledTime: null,
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // When scheduling, set attendees and outcome to empty/null
    onSubmit({
      ...formData,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Schedule New Visit
      </h2>
      <p className="text-sm text-gray-600 mb-4">For Proposal ID: {proposalId.substring(0, 8)}...</p>

      <DateInput id="scheduledDate" label="Scheduled Date" value={formData.scheduledDate || ''} onChange={handleChange} required />
      <Input id="scheduledTime" label="Scheduled Time" value={formData.scheduledTime || ''} onChange={handleChange} type="time" />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Schedule Visit
        </Button>
      </div>
    </form>
  );
};

export default ScheduleVisitForm;
