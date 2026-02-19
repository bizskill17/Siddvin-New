import React, { useEffect, useMemo, useRef, useState } from 'react';

interface SelectInputOption {
  value: string;
  label: string;
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id: string;
  options: SelectInputOption[];
  placeholder?: string;
}

const SelectInput: React.FC<SelectInputProps> = ({
  label,
  id,
  options,
  className = '',
  placeholder = 'Select...',
  value,
  onChange,
  required,
  disabled,
  name,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedValue = typeof value === 'string' ? value : '';
  const selectedOption = options.find((option) => option.value === selectedValue);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedSearch)
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleOptionSelect = (optionValue: string) => {
    if (disabled) return;

    if (onChange) {
      const syntheticEvent = {
        target: { id, name: name || id, value: optionValue },
        currentTarget: { id, name: name || id, value: optionValue },
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }

    setError('');
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className={`mb-4 ${className}`} ref={wrapperRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative w-full rounded-md border bg-[#ece8e3] py-2 pl-3 pr-10 text-left shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-100 ${error ? 'border-red-500' : 'border-gray-300'}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={`block truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-md bg-[#ece8e3] shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="p-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search options..."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                aria-label={`${label || id} search`}
                autoFocus
              />
            </div>
            <ul className="max-h-60 overflow-auto py-1 text-sm" role="listbox" aria-labelledby={id}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect(option.value)}
                      className={`w-full px-3 py-2 text-left hover:bg-amber-50 ${
                        option.value === selectedValue ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-gray-500">No options found</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* hidden input keeps native required validation behavior */}
      <input
        type="text"
        tabIndex={-1}
        value={selectedValue}
        onChange={() => {}}
        required={required}
        onInvalid={(e) => {
          e.preventDefault();
          setError('This field is required.');
        }}
        aria-hidden="true"
        className="absolute h-0 w-0 opacity-0 pointer-events-none"
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default SelectInput;

