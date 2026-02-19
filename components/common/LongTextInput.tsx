import React from 'react';

interface LongTextInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  id: string;
  value?: string | null; // Allow null for values
}

const LongTextInput: React.FC<LongTextInputProps> = ({ label, id, className = '', value, ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={4}
        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${className}`}
        value={value === null || value === undefined ? '' : value} // Handle null/undefined values for display
        {...props}
      />
    </div>
  );
};

export default LongTextInput;