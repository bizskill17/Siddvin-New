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
  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">{value}</p>
        {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-lg font-bold text-orange-700" aria-hidden="true">{icon}</span>
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
          <p className="mt-1 text-sm text-gray-600">Your proposal pipeline at a glance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard title="Active Proposals" value={String(activeProposals)} icon="▤" note="Not yet completed" />
        <MetricCard title="Visits This Week" value={String(visitsThisWeek)} icon="▦" note="Scheduled or completed this week" />
        <MetricCard title="Pending Follow-ups" value={String(pendingFollowUps)} icon="◷" note="Proposals awaiting follow-up" />
        <MetricCard title="Billed Fees" value={formatCurrency(billedFees)} icon="₹" note="Total invoiced amount" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Proposal Stage Summary</h2>
              <p className="mt-1 text-xs text-gray-500">Select a stage to open its proposal list.</p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">{proposals.length} total</span>
          </div>
          <div className="space-y-3">
            {stageCounts.map(({ stage, count }) => (
              <button
                key={stage}
                type="button"
                onClick={() => onStageClick(stage)}
                className="group w-full rounded-lg px-2 py-2 text-left transition hover:bg-orange-50"
                title={`View proposals in ${stage}`}
              >
                <span className="mb-1.5 flex items-center justify-between gap-3">
                  <StageBadge stage={stage} />
                  <span className="min-w-7 text-right text-sm font-bold text-gray-700">{count}</span>
                </span>
                <span className="block h-2 overflow-hidden rounded-full bg-gray-100">
                  <span
                    className="block h-full rounded-full bg-orange-600 transition-all"
                    style={{ width: count ? `${Math.max(7, (count / maxStageCount) * 100)}%` : '0%' }}
                  />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Visits</h2>
              <p className="mt-1 text-xs text-gray-500">The next scheduled property meetings</p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">{upcomingVisits.length} upcoming</span>
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
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-orange-50 text-orange-800">
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
