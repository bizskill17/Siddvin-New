import React, { useState, useEffect } from 'react';
import { Visit, SidvinTeamMember } from '../../types';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import LongTextInput from '../common/LongTextInput';
import SelectInput from '../common/SelectInput';
import Button from '../common/Button';
import MultiSelectInput from '../common/MultiSelectInput';

interface EditVisitFormProps {
  proposalId: string;
  initialData?: Visit;
  sidvinTeamMembers: SidvinTeamMember[];
  onSubmit: (visit: Omit<Visit, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => void;
  onCancel: () => void;
  currentUserName: string;
}

const EditVisitForm: React.FC<EditVisitFormProps> = ({ proposalId, initialData, sidvinTeamMembers, onSubmit, onCancel, currentUserName }) => {
  const [formData, setFormData] = useState<Omit<Visit, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>>(
    initialData
      ? {
          proposalId: initialData.proposalId,
          scheduledDate: initialData.scheduledDate,
          scheduledTime: initialData.scheduledTime,
          meetingType: initialData.meetingType,
          meetingAgenda: initialData.meetingAgenda || '',
          meetingLink: initialData.meetingLink || null,
          visitDate: initialData.visitDate,
          developerAttendees: initialData.developerAttendees,
          brandAttendees: initialData.brandAttendees,
          sidvinAttendees: initialData.sidvinAttendees,
          visitOutcome: initialData.visitOutcome,
        }
      : {
          proposalId,
          scheduledDate: null,
          scheduledTime: null,
          meetingType: 'Physical',
          meetingAgenda: '',
          meetingLink: null,
          visitDate: null,
          developerAttendees: '',
          brandAttendees: '',
          sidvinAttendees: '',
          visitOutcome: '',
        }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        proposalId: initialData.proposalId,
        scheduledDate: initialData.scheduledDate,
        scheduledTime: initialData.scheduledTime,
        meetingType: initialData.meetingType,
        meetingAgenda: initialData.meetingAgenda || '',
        meetingLink: initialData.meetingLink || null,
        visitDate: initialData.visitDate,
        developerAttendees: initialData.developerAttendees,
        brandAttendees: initialData.brandAttendees,
        sidvinAttendees: initialData.sidvinAttendees,
        visitOutcome: initialData.visitOutcome,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => {
      if (id === 'meetingType') {
        return {
          ...prev,
          meetingType: value as Visit['meetingType'],
          meetingLink: value === 'Virtual' ? prev.meetingLink : null,
        };
      }
      return { ...prev, [id]: value };
    });
  };

  const handleSidvinAttendeesChange = (selectedNames: string[]) => {
    setFormData((prev) => ({ ...prev, sidvinAttendees: selectedNames.join(', ') }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const sidvinTeamOptions = sidvinTeamMembers.map(member => ({ value: member.name, label: `${member.name} (${member.designation})` }));

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Edit Visit Details</h2>
        <Button type="button" variant="primary" onClick={onCancel}>Back</Button>
      </div>

      <DateInput id="scheduledDate" label="Scheduled Date" value={formData.scheduledDate || ''} onChange={handleChange} required />
      <Input id="scheduledTime" label="Scheduled Time" value={formData.scheduledTime || ''} onChange={handleChange} type="time" required />
      <SelectInput
        id="meetingType"
        label="Meeting Type"
        value={formData.meetingType || ''}
        onChange={handleChange}
        options={[
          { value: 'Physical', label: 'Physical' },
          { value: 'Virtual', label: 'Virtual' },
        ]}
      />
      {formData.meetingType === 'Virtual' && (
        <Input
          id="meetingLink"
          label="Meeting Link"
          value={formData.meetingLink || ''}
          onChange={handleChange}
          placeholder="https://..."
          required
        />
      )}
      <LongTextInput id="meetingAgenda" label="Meeting Agenda" value={formData.meetingAgenda || ''} onChange={handleChange} />
      <Input id="developerAttendees" label="Developer Attendees" value={formData.developerAttendees} onChange={handleChange} />
      <Input id="brandAttendees" label="Brand Attendees" value={formData.brandAttendees} onChange={handleChange} />
      <MultiSelectInput id="sidvinAttendees" label="Sidvin Attendees" options={sidvinTeamOptions} value={formData.sidvinAttendees ? formData.sidvinAttendees.split(', ').filter(Boolean) : []} onChange={handleSidvinAttendeesChange} placeholder="Select Sidvin Team Members" />

      <hr className="my-6 border-gray-200" />
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Record Actual Visit Outcome</h3>
      <DateInput id="visitDate" label="Actual Visit Date" value={formData.visitDate || ''} onChange={handleChange} />
      <LongTextInput id="visitOutcome" label="Visit Outcome" value={formData.visitOutcome} onChange={handleChange} />
      <Input id="updatedByDisplay" label="Updated By" value={currentUserName} readOnly />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Update Visit</Button>
      </div>
    </form>
  );
};

export default EditVisitForm;



