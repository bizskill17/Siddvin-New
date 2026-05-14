import React from 'react';
import { Brand, CurrentStageEnum, Proposal, Property, Visit } from '../../types';
import StageBadge from '../common/StageBadge';
import { formatDateDisplay } from '../common/dateUtils';

interface DashboardViewProps {
  proposals: Proposal[];
  visits: Visit[];
  properties: Property[];
  brands: Brand[];
  onStageClick: (stage: CurrentStageEnum) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  proposals,
  visits,
  properties,
  brands,
  onStageClick,
}) => {
  const stageCounts = Object.values(CurrentStageEnum).map((stage) => ({
    stage,
    count: proposals.filter((p) => p.currentStage === stage).length,
  }));

  const getPropertyAddress = (propertyId: string) => properties.find((p) => p.id === propertyId)?.address || 'N/A';
  const getBrandName = (brandId: string) => brands.find((b) => b.id === brandId)?.name || 'N/A';
  const getProposal = (proposalId: string) => proposals.find((p) => p.id === proposalId);

  const upcomingVisits = visits
    .filter((v) => !!v.scheduledDate && !v.visitDate)
    .sort((a, b) => new Date(a.scheduledDate || '').getTime() - new Date(b.scheduledDate || '').getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-[#ece8e3] border border-gray-200 rounded-lg shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stage Distribution</h2>
          <div className="space-y-3">
            {stageCounts.map(({ stage, count }) => (
              <button
                key={stage}
                type="button"
                onClick={() => onStageClick(stage)}
                className="w-full flex items-center justify-between rounded-md px-2 py-1 hover:bg-amber-50 transition"
                title={`View proposals in ${stage}`}
              >
                <StageBadge stage={stage} />
                <span className="text-sm font-semibold text-gray-700">{count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-[#ece8e3] border border-gray-200 rounded-lg shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Visits</h2>
          {upcomingVisits.length === 0 ? (
            <p className="text-sm text-gray-600">No scheduled pending visits.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingVisits.map((visit) => {
                const proposal = getProposal(visit.proposalId);
                return (
                  <li key={visit.id} className="border border-gray-100 rounded-md p-3">
                    <p className="text-sm font-semibold text-gray-800">
                      {proposal ? `${getBrandName(proposal.brandId)} - ${getPropertyAddress(proposal.propertyId)}` : 'Unknown Proposal'}
                    </p>
                    <p className="text-xs text-gray-600">
                      Date: {formatDateDisplay(visit.scheduledDate)} | Time: {visit.scheduledTime || 'N/A'}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

    </div>
  );
};

export default DashboardView;

