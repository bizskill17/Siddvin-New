import React, { useState, useEffect, useRef } from 'react';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectInputProps {
  label?: string;
  id: string;
  options: MultiSelectOption[];
  value: string[]; // Array of selected values
  onChange: (selectedValues: string[]) => void;
  placeholder?: string;
  className?: string;
}

const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  label,
  id,
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedItems(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleOptionClick = (optionValue: string) => {
    let newSelectedItems;
    if (selectedItems.includes(optionValue)) {
      newSelectedItems = selectedItems.filter((item) => item !== optionValue);
    } else {
      newSelectedItems = [...selectedItems, optionValue];
    }
    setSelectedItems(newSelectedItems);
    onChange(newSelectedItems);
  };

  const getDisplayValue = () => {
    if (selectedItems.length === 0) {
      return placeholder;
    }
    return selectedItems
      .map((itemValue) => options.find((opt) => opt.value === itemValue)?.label || itemValue)
      .join(', ');
  };

  return (
    <div className={`mb-4 ${className}`} ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
          onClick={handleToggle}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="block truncate">{getDisplayValue()}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.25 9.76l-3.25-3.5a.75.75 0 011.1-1.02L10 15.148l2.7-2.908a.75.75 0 011.1 1.02l-3.25 3.5a.75.75 0 01-.55.24z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        {isOpen && (
          <ul
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
            role="listbox"
            aria-labelledby={id}
          >
            {options.map((option) => (
              <li
                key={option.value}
                className={`relative cursor-default select-none py-2 pl-3 pr-9 ${
                  selectedItems.includes(option.value) ? 'bg-indigo-600 text-white' : 'text-gray-900'
                }`}
                onClick={() => handleOptionClick(option.value)}
                role="option"
                aria-selected={selectedItems.includes(option.value)}
              >
                <span className={`block truncate ${selectedItems.includes(option.value) ? 'font-semibold' : 'font-normal'}`}>
                  {option.label}
                </span>
                {selectedItems.includes(option.value) && (
                  <span
                    className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                      selectedItems.includes(option.value) ? 'text-white' : 'text-indigo-600'
                    }`}
                  >
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MultiSelectInput;