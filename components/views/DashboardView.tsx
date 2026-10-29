import React from 'react';
import { Brand, CurrentStageEnum, Proposal, Property, Visit } from '../../types';
import { formatDateDisplay } from '../common/dateUtils';

interface DashboardViewProps {
  proposals: Proposal[];
  visits: Visit[];
  properties: Property[];
  brands: Brand[];
  onStageClick: (stage: CurrentStageEnum) => void;
}

const parseLocalDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const MetricCard: React.FC<{ title: string; value: string; icon: string; note?: string }> = ({ title, value, icon, note }) => (
  <section className="dashboard-card rounded-xl border p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">{value}</p>
        {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
      </div>
      <span className="dashboard-accent-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold" aria-hidden="true">{icon}</span>
    </div>
  </section>
);

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
  const maxStageCount = Math.max(1, ...stageCounts.map(({ count }) => count));

  const activeProposals = proposals.filter((p) => p.currentStage !== CurrentStageEnum.CompletedProposal).length;
  const pendingFollowUps = proposals.filter((p) => p.currentStage === CurrentStageEnum.PendingFollowUp).length;
  const billedFees = proposals.reduce((total, p) => total + (Number(p.invoiceAmount) || 0), 0);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

  const now = new Date();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - mondayOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const visitsThisWeek = visits.filter((visit) => {
    const date = parseLocalDate(visit.scheduledDate || visit.visitDate);
    return !!date && date >= startOfWeek && date <= endOfWeek;
  }).length;

  const getPropertyAddress = (propertyId: string) => properties.find((p) => p.id === propertyId)?.address || 'N/A';
  const getBrandName = (brandId: string) => brands.find((b) => b.id === brandId)?.name || 'N/A';
  const getProposal = (proposalId: string) => proposals.find((p) => p.id === proposalId);

  const upcomingVisits = visits
    .filter((v) => !!v.scheduledDate && !v.visitDate)
    .sort((a, b) => String(a.scheduledDate || '').localeCompare(String(b.scheduledDate || '')))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard title="Active Proposals" value={String(activeProposals)} icon="▤" note="Not yet completed" />
        <MetricCard title="Visits This Week" value={String(visitsThisWeek)} icon="▦" note="Scheduled or completed this week" />
        <MetricCard title="Pending Follow-ups" value={String(pendingFollowUps)} icon="◷" note="Proposals awaiting follow-up" />
        <MetricCard title="Billed Fees" value={formatCurrency(billedFees)} icon="₹" note="Total invoiced amount" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="dashboard-card rounded-xl border p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Proposal Stage Summary</h2>
            </div>
            <span className="dashboard-count rounded-full border px-3 py-1 text-xs font-semibold">{proposals.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-3 2xl:grid-cols-5">
            {stageCounts.map(({ stage, count }) => (
              <button
                key={stage}
                type="button"
                onClick={() => onStageClick(stage)}
                className="dashboard-stage-card group flex min-w-0 flex-col items-center rounded-xl border bg-white px-2 pb-2 pt-2 text-center transition"
                title={`View proposals in ${stage}`}
              >
                <span className="flex h-24 w-full items-end justify-center border-b border-dashed border-gray-200">
                  <span className="dashboard-stage-bar relative flex w-8 items-start justify-center rounded-t-md transition" style={{ height: count ? `${Math.max(10, (count / maxStageCount) * 76)}px` : '4px' }}>
                    <span className="dashboard-count absolute -top-6 rounded-full border bg-white px-2 py-0.5 text-xs font-bold">{count}</span>
                  </span>
                </span>
                <span className="mt-2 line-clamp-2 min-h-8 text-[11px] font-medium leading-4 text-gray-700">
                  {stage.replace(/^\d+\.\s*/, '')}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-card rounded-xl border p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Visits</h2>
              <p className="mt-1 text-xs text-gray-500">The next scheduled property meetings</p>
            </div>
            <span className="dashboard-count rounded-full border px-3 py-1 text-xs font-semibold">{upcomingVisits.length} upcoming</span>
          </div>
          {upcomingVisits.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-gray-700">No upcoming visits</p>
              <p className="mt-1 text-xs text-gray-500">Scheduled visits will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingVisits.map((visit) => {
                const proposal = getProposal(visit.proposalId);
                const date = visit.scheduledDate || '';
                const localDate = parseLocalDate(date);
                return (
                  <li key={visit.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="dashboard-accent-icon flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg">
                      <span className="text-[10px] font-semibold uppercase">{localDate ? new Intl.DateTimeFormat('en', { month: 'short' }).format(localDate) : 'TBD'}</span>
                      <span className="text-lg font-bold leading-none">{localDate ? new Intl.DateTimeFormat('en', { day: '2-digit' }).format(localDate) : '—'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {proposal ? `${getBrandName(proposal.brandId)} · ${getPropertyAddress(proposal.propertyId)}` : 'Unknown Proposal'}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        {formatDateDisplay(visit.scheduledDate)}{visit.scheduledTime ? ` · ${visit.scheduledTime}` : ''}
                      </p>
                    </div>
                    <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 sm:inline-flex">Scheduled</span>
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
