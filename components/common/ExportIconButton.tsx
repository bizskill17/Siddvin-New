import React from 'react';
import Button from './Button';

interface ExportIconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  kind: 'excel' | 'pdf';
}

const iconMap = {
  excel: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="excel-download-bg" cx="50%" cy="36%" r="70%">
          <stop offset="0%" stopColor="#545454" />
          <stop offset="60%" stopColor="#1f1f1f" />
          <stop offset="100%" stopColor="#050505" />
        </radialGradient>
        <filter id="excel-download-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#excel-download-bg)" stroke="#bcbcbc" strokeWidth="1.2" />
      <path
        d="M12 5.2v8.4"
        stroke="#f2f2f2"
        strokeWidth="2.2"
        strokeLinecap="round"
        filter="url(#excel-download-glow)"
      />
      <path
        d="M7.7 11.4L12 17.6l4.3-6.2H13.4V5.2h-2.8v6.2H7.7z"
        fill="#f2f2f2"
        filter="url(#excel-download-glow)"
      />
    </svg>
  ),
  pdf: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M8 13h8M8 9h3" />
    </svg>
  ),
};

const labelMap = {
  excel: 'Download Excel',
  pdf: 'Download PDF',
};

const ExportIconButton: React.FC<ExportIconButtonProps> = ({ kind, className = '', ...props }) => (
  <Button
    type="button"
    size="sm"
    variant="secondary"
    title={labelMap[kind]}
    aria-label={labelMap[kind]}
    className={`inline-flex items-center justify-center border border-orange-200 bg-white text-orange-700 hover:bg-orange-50 focus:ring-orange-600 !px-2.5 ${className}`}
    {...props}
  >
    {iconMap[kind]}
  </Button>
);

export default ExportIconButton;
