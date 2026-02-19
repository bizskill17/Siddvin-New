import React, { useState, useEffect } from 'react';
import { Visit, SidvinTeamMember } from '../../types';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import LongTextInput from '../common/LongTextInput';
import Button from '../common/Button';
import MultiSelectInput from '../common/MultiSelectInput';

interface EditVisitFormProps {
  proposalId: string;
  initialData?: Visit;
  sidvinTeamMembers: SidvinTeamMember[]; // New prop for team members
  onSubmit: (visit: Omit<Visit, 'id'>) => void;
  onCancel: () => void;
}

const EditVisitForm: React.FC<EditVisitFormProps> = ({ proposalId, initialData, sidvinTeamMembers, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Visit, 'id'>>(
    initialData
      ? { ...initialData }
      : {
          proposalId: proposalId,
          scheduledDate: null,
          scheduledTime: null,
          visitDate: null,
          developerAttendees: '',
          brandAttendees: '',
          sidvinAttendees: '', // Will be updated by MultiSelect
          visitOutcome: '',
        }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData(prev => ({ ...prev, proposalId: proposalId }));
    }
  }, [initialData, proposalId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSidvinAttendeesChange = (selectedNames: string[]) => {
    setFormData((prev) => ({
      ...prev,
      sidvinAttendees: selectedNames.join(', '), // Store as comma-separated string
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const sidvinTeamOptions = sidvinTeamMembers.map(member => ({
    value: member.name, // Use name for display and storage
    label: `${member.name} (${member.designation})`
  }));

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Edit Visit Details
      </h2>
      <p className="text-sm text-gray-600 mb-4">For Proposal ID: {proposalId.substring(0, 8)}...</p>

      <DateInput id="scheduledDate" label="Scheduled Date" value={formData.scheduledDate || ''} onChange={handleChange} required />
      <Input id="scheduledTime" label="Scheduled Time" value={formData.scheduledTime || ''} onChange={handleChange} type="time" />
      <Input id="developerAttendees" label="Developer Attendees" value={formData.developerAttendees} onChange={handleChange} />
      <Input id="brandAttendees" label="Brand Attendees" value={formData.brandAttendees} onChange={handleChange} />
      <MultiSelectInput
        id="sidvinAttendees"
        label="Sidvin Attendees"
        options={sidvinTeamOptions}
        value={formData.sidvinAttendees ? formData.sidvinAttendees.split(', ').filter(Boolean) : []} // Convert string to array
        onChange={handleSidvinAttendeesChange}
        placeholder="Select Sidvin Team Members"
      />

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Record Actual Visit Outcome</h3>
      <DateInput id="visitDate" label="Actual Visit Date" value={formData.visitDate || ''} onChange={handleChange} />
      <LongTextInput id="visitOutcome" label="Visit Outcome" value={formData.visitOutcome} onChange={handleChange} />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Update Visit
        </Button>
      </div>
    </form>
  );
};

export default EditVisitForm;
