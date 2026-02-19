import React, { useState } from 'react';

interface LongTextInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  id: string;
  value?: string | null; // Allow null for values
}

const LongTextInput: React.FC<LongTextInputProps> = ({
  label,
  id,
  className = '',
  value,
  required,
  onChange,
  onInvalid,
  ...props
}) => {
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (required && !e.target.value.trim()) {
      setError('This field is required.');
    } else {
      setError('');
    }
    onChange?.(e);
  };

  const handleInvalid = (e: React.InvalidEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setError('This field is required.');
    onInvalid?.(e);
  };

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={id}
        rows={4}
        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
        value={value === null || value === undefined ? '' : value} // Handle null/undefined values for display
        required={required}
        onChange={handleChange}
        onInvalid={handleInvalid}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default LongTextInput;
