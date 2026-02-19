import React, { useState, useEffect } from 'react';
import { SidvinTeamMember } from '../../types';
import Input from '../common/Input';
import SelectInput from '../common/SelectInput';
import Button from '../common/Button';

interface SidvinTeamFormProps {
  initialData?: SidvinTeamMember;
  onSubmit: (member: Omit<SidvinTeamMember, 'id'>) => void;
  onCancel: () => void;
}

const SidvinTeamForm: React.FC<SidvinTeamFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Omit<SidvinTeamMember, 'id'>>(
    initialData
      ? { ...initialData }
      : {
          name: '',
          designation: '',
          mobile: '',
          email: '',
          role: 'Employee', // Default role
          password: '',
        }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const roleOptions = [
    { value: 'Employee', label: 'Employee' },
    { value: 'Admin', label: 'Admin' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {initialData ? 'Edit Team Member' : 'Add New Team Member'}
      </h2>
      <Input id="name" label="Name" value={formData.name} onChange={handleChange} required />
      <Input id="designation" label="Designation" value={formData.designation} onChange={handleChange} required />
      <Input id="mobile" label="Mobile" value={formData.mobile} onChange={handleChange} type="tel" required />
      <Input id="email" label="Email" value={formData.email} onChange={handleChange} type="email" required />
      <SelectInput id="role" label="Role" options={roleOptions} value={formData.role} onChange={handleChange} required />
      <Input id="password" label="Password" value={formData.password} onChange={handleChange} type="password" required />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Member' : 'Add Member'}
        </Button>
      </div>
    </form>
  );
};

export default SidvinTeamForm;