import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  value?: string | number | null; // Allow number | null for values
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  className = '',
  value,
  required,
  disabled,
  readOnly,
  onChange,
  onInvalid,
  ...props
}) => {
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (required && !e.target.value.trim()) {
      setError('This field is required.');
    } else {
      setError('');
    }
    onChange?.(e);
  };

  const handleInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
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
      <input
        id={id}
        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm ${error ? 'border-red-500' : 'border-gray-300'} ${disabled || readOnly ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''} ${className}`}
        value={value === null || value === undefined ? '' : value} // Handle null/undefined values for display
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        onChange={handleChange}
        onInvalid={handleInvalid}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Input;
