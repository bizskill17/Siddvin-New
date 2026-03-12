import React from 'react';
import Button from './Button';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, onBack, backLabel = 'Back', actions }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      {onBack && (
        <Button
          type="button"
          variant="primary"
          onClick={onBack}
         
        >
          {backLabel}
        </Button>
      )}
      <h1 className="text-3xl font-bold text-orange-700">{title}</h1>
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

export default PageHeader;


