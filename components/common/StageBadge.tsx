import React from 'react';
import { CurrentStageEnum } from '../../types';

interface StageBadgeProps {
  stage: CurrentStageEnum;
  className?: string;
}

const StageBadge: React.FC<StageBadgeProps> = ({ stage, className }) => {
  let colorClass = 'bg-gray-100 text-gray-800'; // Default

  // Assign color classes based on the actual CurrentStageEnum values
  switch (stage) {
    case CurrentStageEnum.Draft:
      colorClass = 'bg-blue-100 text-blue-800';
      break;
    case CurrentStageEnum.PendingFollowUp:
    case CurrentStageEnum.PendingVisitScheduling:
      colorClass = 'bg-purple-100 text-purple-800';
      break;
    case CurrentStageEnum.PendingVisit:
      colorClass = 'bg-yellow-100 text-yellow-800';
      break;
    case CurrentStageEnum.PendingNextVisit:
    case CurrentStageEnum.PendingRateFinalization:
      colorClass = 'bg-teal-100 text-teal-800';
      break;
    case CurrentStageEnum.PendingTermsFinalization:
      colorClass = 'bg-indigo-100 text-indigo-800';
      break;
    case CurrentStageEnum.PendingAgreement:
      colorClass = 'bg-green-100 text-green-800';
      break;
    case CurrentStageEnum.PendingStoreOpening:
      colorClass = 'bg-emerald-100 text-emerald-800';
      break;
    case CurrentStageEnum.PendingBrandFees:
      colorClass = 'bg-red-100 text-red-800 font-bold';
      break;
    default:
      colorClass = 'bg-gray-100 text-gray-800';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {stage}
    </span>
  );
};

export default StageBadge;