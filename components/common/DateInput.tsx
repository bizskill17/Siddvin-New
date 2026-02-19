import React, { useState } from 'react';

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
}

const DateInput: React.FC<DateInputProps> = ({
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (required && !e.target.value) {
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
        type="date"
        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
        value={value || ''} // Ensure value is a string or empty to avoid React warnings
        required={required}
        onChange={handleChange}
        onInvalid={handleInvalid}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default DateInput;
