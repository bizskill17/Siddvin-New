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
          photoDataUrl: initialData.photoDataUrl || '',
        }
      : {
          name: '',
          designation: '',
          mobile: '',
          email: '',
          role: '',
          password: '',
          photoDataUrl: '',
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
        photoDataUrl: initialData.photoDataUrl || '',
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

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return window.alert('Choose an image file.');
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 320 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/webp', 0.72);
        if (photoDataUrl.length > 90000) return window.alert('This photo is still too large. Please choose a smaller image.');
        setFormData((prev) => ({ ...prev, photoDataUrl }));
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const roleOptions = [
    { value: 'Employee', label: 'Employee' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Super Admin', label: 'Super Admin' },
    { value: 'Property Fee Coordinator', label: 'Property Fee Coordinator' },
  ];

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl p-6 bg-[#ece8e3] rounded-lg shadow-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit Team Member' : 'Add New Team Member'}</h2>
        <Button type="button" variant="primary" onClick={onCancel}>Back</Button>
      </div>
      <Input id="name" label="Name" value={formData.name} onChange={handleChange} required />
      <Input id="designation" label="Designation" value={formData.designation} onChange={handleChange} required />
      <Input id="mobile" label="Mobile" value={formData.mobile} onChange={handleChange} type="tel" required />
      <Input id="email" label="Email" value={formData.email} onChange={handleChange} type="email" required />
      <div className="mb-4">
        <label htmlFor="team-photo" className="mb-1 block text-sm font-medium text-gray-700">Profile Photo</label>
        <div className="flex items-center gap-4">
          {formData.photoDataUrl ? <img src={formData.photoDataUrl} alt="Profile preview" className="h-14 w-14 rounded-full border border-orange-200 object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">Photo</div>}
          <input id="team-photo" type="file" accept="image/*" onChange={handlePhotoChange} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:font-semibold file:text-orange-800" />
          {formData.photoDataUrl && <Button type="button" variant="secondary" onClick={() => setFormData((prev) => ({ ...prev, photoDataUrl: '' }))}>Remove</Button>}
        </div>
        <p className="mt-1 text-xs text-gray-500">The photo appears beside the team member’s name in the left menu.</p>
      </div>
      <SelectInput id="role" label="Role" options={roleOptions} value={formData.role} onChange={handleChange} required placeholder="Select Role" />
      <Input
        id="password"
        label={initialData ? 'New Password' : 'Password'}
        value={formData.password}
        onChange={handleChange}
        type="password"
        autoComplete="new-password"
        placeholder={initialData ? 'Leave blank to keep the current password' : undefined}
        required={!initialData}
      />

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Member' : 'Add Member'}</Button>
      </div>
    </form>
  );
};

export default SidvinTeamForm;



