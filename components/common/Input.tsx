import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  value?: string | number | null; // Allow number | null for values
}

const Input: React.FC<InputProps> = ({ label, id, className = '', value, ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${className}`}
        value={value === null || value === undefined ? '' : value} // Handle null/undefined values for display
        {...props}
      />
    </div>
  );
};

export default Input;