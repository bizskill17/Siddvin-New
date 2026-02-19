import React from 'react';

interface CheckboxInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
}

const CheckboxInput: React.FC<CheckboxInputProps> = ({ label, id, className = '', ...props }) => {
  return (
    <div className="mb-4 flex items-center">
      <input
        id={id}
        type="checkbox"
        className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${className}`}
        {...props}
      />
      {label && (
        <label htmlFor={id} className="ml-2 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
    </div>
  );
};

export default CheckboxInput;
