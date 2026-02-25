import React, { useState, useEffect } from 'react';
import { SidvinTeamMember } from '../../types';
import Input from '../common/Input';
import SelectInput from '../common/SelectInput';
import Button from '../common/Button';

interface SidvinTeamFormProps {
  initialData?: SidvinTeamMember;
  onSubmit: (member: Omit<SidvinTeamMember, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>) => void;
  onCancel: () => void;
}

type SidvinTeamFormData = Omit<SidvinTeamMember, 'id' | 'role' | 'createdAt' | 'updatedAt' | 'updatedBy'> & {
  role: SidvinTeamMember['role'] | '';
};

const SidvinTeamForm: React.FC<SidvinTeamFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<SidvinTeamFormData>(
    initialData
      ? {
          name: initialData.name,
          designation: initialData.designation,
          mobile: initialData.mobile,
          email: initialData.email,
          role: initialData.role,
          password: initialData.password,
        }
      : {
          name: '',
          designation: '',
          mobile: '',
          email: '',
          role: '',
          password: '',
        }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        designation: initialData.designation,
        mobile: initialData.mobile,
        email: initialData.email,
        role: initialData.role,
        password: initialData.password,
      });
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
    if (!formData.role) return;
    onSubmit(formData as Omit<SidvinTeamMember, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>);
  };

  const roleOptions = [
    { value: 'Employee', label: 'Employee' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Super Admin', label: 'Super Admin' },
    { value: 'Property Fee Coordinator', label: 'Property Fee Coordinator' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#ece8e3] rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit Team Member' : 'Add New Team Member'}</h2>
        <Button type="button" variant="secondary" onClick={onCancel}>Back</Button>
      </div>
      <Input id="name" label="Name" value={formData.name} onChange={handleChange} required />
      <Input id="designation" label="Designation" value={formData.designation} onChange={handleChange} required />
      <Input id="mobile" label="Mobile" value={formData.mobile} onChange={handleChange} type="tel" required />
      <Input id="email" label="Email" value={formData.email} onChange={handleChange} type="email" required />
      <SelectInput id="role" label="Role" options={roleOptions} value={formData.role} onChange={handleChange} required placeholder="Select Role" />
      <Input id="password" label="Password" value={formData.password} onChange={handleChange} type="password" required />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Member' : 'Add Member'}</Button>
      </div>
    </form>
  );
};

export default SidvinTeamForm;
