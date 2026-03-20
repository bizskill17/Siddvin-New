import React, { useEffect, useMemo, useState } from 'react';
import { Brand, CurrentStageEnum, FollowUp, Property, Proposal, TermSheetAgreement, Visit } from '../../types';
import { formatDateDisplay } from '../common/dateUtils';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface PropertyPortalViewProps {
  properties: Property[];
  brands: Brand[];
  proposals: Proposal[];
  visits: Visit[];
  followUps: FollowUp[];
  termSheetAgreements: TermSheetAgreement[];
  initialPropertyId?: string;
  onSessionStart: (propertyId: string) => void;
  onSessionEnd: () => void;
  onRefresh: () => Promise<void>;
  onBackToTeamLogin: () => void;
}

interface ActivityItem {
  id: string;
  proposalId: string;
  date: string | null;
  ts: number;
  brand: string;
  activity: string;
  remarks: string;
  updatedBy: string;
}

interface ProposalActivityBundle {
  proposal: Proposal;
  brand: Brand | null;
  activities: ActivityItem[];
  isCancelled: boolean;
}

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;

const toTs = (value: string | null | undefined): number => {
  if (!value) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`).getTime();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('/');
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00`).getTime();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const findPropertyByIdentifier = (properties: Property[], input: string): Property | null => {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  const serial = value.match(/(\d+)$/);
  const serialNo = serial ? Number(serial[1]) : null;
  return (
    properties.find((p) => p.id.toLowerCase() === value) ||
    properties.find((p) => serialNo !== null && Number(p.serialNo || 0) === serialNo) ||
    properties.find((p) => p.address.toLowerCase().includes(value)) ||
    null
  );
};

const collectProposalActivities = (
  proposal: Proposal,
  brand: Brand | null,
  visits: Visit[],
  followUps: FollowUp[],
  termSheet: TermSheetAgreement | undefined,
): ProposalActivityBundle => {
  const brandName = brand?.name || 'Unknown Brand';
  const rows: ActivityItem[] = [];
  const push = (
    id: string,
    date: string | null | undefined,
    activity: string,
    remarks: string | null | undefined,
    updatedBy: string | null | undefined,
  ) => {
    if (!date) return;
    rows.push({
      id,
      proposalId: proposal.id,
      date,
      ts: toTs(date),
      brand: brandName,
      activity,
      remarks: (remarks || '').trim() || 'N/A',
      updatedBy: (updatedBy || '').trim() || 'System',
    });
  };

  push(`proposal-${proposal.id}`, proposal.proposalDate, 'Proposal Sent', proposal.brandRemarks, proposal.updatedBy);
  followUps.forEach((f) => {
    const label = f.status === 'Cancel Proposal' ? 'Proposal Cancelled' : 'Follow Up Done';
    push(`followup-${f.id}`, f.followUpDate, label, f.cancelRemarks || f.remarks, f.updatedBy);
  });
  visits.forEach((v) => {
    push(`visit-scheduled-${v.id}`, v.scheduledDate, 'Property Visit Scheduled', v.scheduledTime, v.updatedBy);
    push(`visit-completed-${v.id}`, v.visitDate, 'Property Visited', v.visitOutcome, v.updatedBy);
  });
  push(`terms-finalized-${proposal.id}`, termSheet?.finalizationDate, 'Terms Finalized', termSheet?.specificTerms, termSheet?.updatedBy);
  push(`terms-prepared-${proposal.id}`, termSheet?.preparationDate, 'Terms Prepared', termSheet?.leaseAgreementRemarks, termSheet?.updatedBy);
  push(`terms-signed-${proposal.id}`, termSheet?.signingDate, 'Terms Signed', '', termSheet?.updatedBy);
  push(`lease-prepared-${proposal.id}`, termSheet?.preparationDate, 'Lease Agreement Prepared', termSheet?.leaseAgreementRemarks, termSheet?.updatedBy);
  push(`lease-signed-${proposal.id}`, termSheet?.signingDate, 'Lease Agreement Signed', '', termSheet?.updatedBy);
  push(`lease-registered-${proposal.id}`, termSheet?.agreementRegistrationDate, 'Lease Agreement Registered', '', termSheet?.updatedBy);
  push(`store-opened-${proposal.id}`, termSheet?.storeOpeningDate, 'Store Opened', '', termSheet?.updatedBy);
  rows.sort((a, b) => b.ts - a.ts);

  const isCancelled = followUps.some((f) => f.status === 'Cancel Proposal');
  return { proposal, brand, activities: rows, isCancelled };
};

const AuthGate: React.FC<{
  properties: Property[];
  onAuthenticate: (propertyId: string) => void;
  onBackToTeamLogin: () => void;
  initialPropertyId?: string;
}> = ({ properties, onAuthenticate, onBackToTeamLogin, initialPropertyId = '' }) => {
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Backend integration: replace local password checks below with password verification endpoint.
    if (!propertyId.trim()) return setError('Please enter Property ID/Code.');
    if (!password.trim()) return setError('Please enter password.');
    const found = findPropertyByIdentifier(properties, propertyId);
    if (!found) return setError('Property not found for entered ID/code.');
    if (String(found.password || '').trim() !== password.trim()) return setError('Incorrect password.');
    onAuthenticate(found.id);
  };

  return (
    <div className="property-portal min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.25),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.2),transparent_35%)]" />
      <div className="relative mx-auto max-w-xl min-h-screen flex items-center px-4 py-8">
        <section className="w-full rounded-3xl bg-white p-8 text-black shadow-2xl">
          <h2 className="text-xl font-bold">Property Login</h2>
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-semibold mb-1">Property ID / Code *</label>
              <input value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500" placeholder="Example: P-9" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500" placeholder="Enter password" required />
            </div>
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
            <button type="submit" className="w-full rounded-xl bg-slate-900 text-white py-2.5 font-semibold hover:bg-slate-700">Access Dashboard</button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm font-semibold text-black underline decoration-dotted underline-offset-4 hover:text-slate-700"
              onClick={onBackToTeamLogin}
            >
              Back to Sidvin Team Login
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ title: string; value: number; accent: string }> = ({ title, value, accent }) => (
  <article className={`rounded-2xl border p-4 shadow-sm ${accent}`}>
    <p className="text-xs font-bold tracking-wider uppercase text-black">{title}</p>
    <p className="mt-2 text-3xl font-extrabold text-black">{value}</p>
  </article>
);

const PropertySummary: React.FC<{ property: Property }> = ({ property }) => (
  <section className="mx-auto max-w-5xl rounded-2xl border border-amber-300 bg-white p-4 shadow-sm">
    <h3 className="portal-heading text-2xl font-bold text-center text-[#7a5916]">Property Summary</h3>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-black">
      <p><span className="font-bold">Proposed Rent:</span> <span className="font-normal">{property.proposedRent ?? 'N/A'}</span></p>
      <p><span className="font-bold">Proposed Area (sqft):</span> <span className="font-normal">{property.proposedArea ?? 'N/A'}</span></p>
      <p><span className="font-bold">Number of Floors:</span> <span className="font-normal">{property.noOfFloors ?? 'N/A'}</span></p>
      <p><span className="font-bold">Service Fee Proposed:</span> <span className="font-normal">{property.serviceFeeProposed || 'N/A'}</span></p>
      <p className="sm:col-span-2"><span className="font-bold">Notes:</span> <span className="font-normal">{property.notes || 'N/A'}</span></p>
      <p className="sm:col-span-2"><span className="font-bold">Contact Persons:</span> <span className="font-normal">{property.contactPersons.length ? property.contactPersons.map((p) => `${p.name} (${p.mobile || 'N/A'})`).join(', ') : 'No contacts'}</span></p>
    </div>
  </section>
);

const IconButton: React.FC<{
  onClick: () => void;
  title: string;
  ariaLabel: string;
  children: React.ReactNode;
  dark?: boolean;
}> = ({ onClick, title, ariaLabel, children, dark }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={ariaLabel}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${
      dark
        ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-700'
        : 'border-amber-500 bg-amber-50 text-black hover:bg-amber-100'
    }`}
  >
    {children}
  </button>
);

const PropertyPortalView: React.FC<PropertyPortalViewProps> = ({
  properties,
  brands,
  proposals,
  visits,
  followUps,
  termSheetAgreements,
  initialPropertyId,
  onSessionStart,
  onSessionEnd,
  onRefresh,
  onBackToTeamLogin,
}) => {
  const [sessionPropertyId, setSessionPropertyId] = useState(initialPropertyId || '');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('All');
  const [activityFilter, setActivityFilter] = useState('All');
  const [updatedByFilter, setUpdatedByFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const property = useMemo(() => properties.find((p) => p.id === sessionPropertyId) || null, [properties, sessionPropertyId]);
  useEffect(() => setSessionPropertyId(initialPropertyId || ''), [initialPropertyId]);

  useEffect(() => {
    if (!sessionPropertyId) return;
    let timer: number | null = null;
    const reset = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setSessionPropertyId('');
        onSessionEnd();
      }, IDLE_TIMEOUT_MS);
    };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach((evt) => window.addEventListener(evt, reset as EventListener, { passive: true }));
    reset();
    return () => {
      if (timer) window.clearTimeout(timer);
      ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach((evt) => window.removeEventListener(evt, reset as EventListener));
    };
  }, [sessionPropertyId, onSessionEnd]);

  const bundles = useMemo(() => {
    if (!property) return [];
    const brandMap = new Map(brands.map((b) => [b.id, b]));
    return proposals
      .filter((p) => p.propertyId === property.id)
      .map((p) => collectProposalActivities(
        p,
        brandMap.get(p.brandId) || null,
        visits.filter((v) => v.proposalId === p.id),
        followUps.filter((f) => f.proposalId === p.id),
        termSheetAgreements.find((t) => t.proposalId === p.id),
      ));
  }, [property, brands, proposals, visits, followUps, termSheetAgreements]);

  const masterRows = useMemo(
    () => bundles.flatMap((b) => b.activities).sort((a, b) => b.ts - a.ts),
    [bundles],
  );

  const brandOptions = useMemo(() => ['All', ...Array.from(new Set(masterRows.map((r) => r.brand))).sort((a, b) => a.localeCompare(b))], [masterRows]);
  const activityOptions = useMemo(() => ['All', ...Array.from(new Set(masterRows.map((r) => r.activity))).sort((a, b) => a.localeCompare(b))], [masterRows]);
  const updatedByOptions = useMemo(() => ['All', ...Array.from(new Set(masterRows.map((r) => r.updatedBy))).sort((a, b) => a.localeCompare(b))], [masterRows]);

  const filteredRows = useMemo(() => {
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : 0;
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : 0;
    const q = search.trim().toLowerCase();

    return masterRows.filter((row) => {
      if (brandFilter !== 'All' && row.brand !== brandFilter) return false;
      if (activityFilter !== 'All' && row.activity !== activityFilter) return false;
      if (updatedByFilter !== 'All' && row.updatedBy !== updatedByFilter) return false;
      if (fromTs && row.ts < fromTs) return false;
      if (toTs && row.ts > toTs) return false;
      if (!q) return true;
      const hay = `${formatDateDisplay(row.date)} ${row.brand} ${row.activity} ${row.remarks} ${row.updatedBy}`.toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => b.ts - a.ts);
  }, [masterRows, brandFilter, activityFilter, updatedByFilter, fromDate, toDate, search]);

  const kpis = useMemo(() => {
    const totalBrands = new Set(bundles.map((b) => b.proposal.brandId)).size;
    const activeDeals = bundles.filter((b) => !b.isCancelled && b.proposal.currentStage !== CurrentStageEnum.CompletedProposal).length;
    const visitsCompleted = bundles.reduce((n, b) => n + b.activities.filter((a) => a.activity === 'Property Visited').length, 0);
    const storesOpened = bundles.filter((b) => b.activities.some((a) => a.activity === 'Store Opened')).length;
    const totalUpdates = masterRows.length;
    return { totalBrands, activeDeals, visitsCompleted, storesOpened, totalUpdates };
  }, [bundles, masterRows]);

  if (!sessionPropertyId) {
    return <AuthGate properties={properties} initialPropertyId={initialPropertyId} onAuthenticate={(id) => { setSessionPropertyId(id); onSessionStart(id); }} onBackToTeamLogin={onBackToTeamLogin} />;
  }

  if (!property) {
    return <div className="min-h-screen p-6 bg-slate-100"><div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 p-5"><p className="font-semibold">Property session expired or invalid.</p><button type="button" className="mt-3 rounded-lg bg-rose-700 text-white px-3 py-2 text-sm" onClick={() => { setSessionPropertyId(''); onSessionEnd(); }}>Return to login</button></div></div>;
  }

  return (
    <div className="property-portal min-h-screen bg-amber-50 text-black">
      <header className="sticky top-0 z-20 bg-white border-b border-amber-300 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5">
          <div className="grid grid-cols-[56px_1fr] items-start gap-3">
            <div className="flex justify-start">
              <img src="https://i.ibb.co/xtfh8687/Main-Logo-qp4bsy1t5svtei9fiwtef930op1p97z2fmjj9swme0.png" alt="Sidvin Logo" className="h-12 w-auto object-contain" />
            </div>
            <div className="flex flex-col">
              <h1 className="portal-heading text-2xl font-bold text-[#7a5916] text-center">Property Dashboard</h1>
              <div className="mt-1 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="hidden md:block" />
                <p className="text-xl font-bold text-black text-center">{property.address}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:justify-self-end">
                  <IconButton
                    title={isRefreshing ? 'Refreshing...' : 'Refresh'}
                    ariaLabel={isRefreshing ? 'Refreshing' : 'Refresh'}
                    onClick={async () => {
                      setError('');
                      setIsRefreshing(true);
                      try {
                        // Backend integration: property fetch endpoint for real-time dashboard refresh.
                        await onRefresh();
                      } catch (e: any) {
                        setError(e?.message || 'Unable to refresh data.');
                      } finally {
                        setIsRefreshing(false);
                      }
                    }}
                  >
                    <svg className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 10-2.34 5.66M20 4v8h-8" />
                    </svg>
                  </IconButton>
                  <IconButton
                    title="Download PDF"
                    ariaLabel="Download PDF"
                    onClick={() => downloadTableAsPdf('property-activity-table', `Property Activity - ${property.address}`)}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#ef4444" />
                      <path d="M14 2v4h4" fill="#fecaca" />
                      <rect x="6.2" y="12.1" width="11.6" height="6.2" rx="1.1" fill="#ffffff" />
                      <path d="M8 16.8v-3.2h1.45c.82 0 1.27.48 1.27 1.15s-.45 1.15-1.27 1.15h-.55v.9H8zm.9-1.64h.5c.27 0 .43-.16.43-.4s-.16-.4-.43-.4h-.5v.8zm2.22 1.64v-3.2h1.12c1.04 0 1.69.64 1.69 1.6s-.65 1.6-1.69 1.6h-1.12zm.9-.8h.22c.53 0 .9-.31.9-.8s-.37-.8-.9-.8h-.22v1.6zm2.77.8v-3.2h2.34v.8h-1.44v.46h1.22v.78h-1.22v1.16h-.9z" fill="#dc2626" />
                    </svg>
                  </IconButton>
                  <IconButton
                    title="Download Excel"
                    ariaLabel="Download Excel"
                    onClick={() => exportRowsToCsv(
                      `property_activity_${new Date().toISOString().slice(0, 10)}`,
                      ['Date', 'Brand', 'Activity', 'Remarks', 'Updated By'],
                      filteredRows.map((r) => [formatDateDisplay(r.date), r.brand, r.activity, r.remarks, r.updatedBy]),
                    )}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5L12 16l3.5-3.5" />
                    </svg>
                  </IconButton>
                  <IconButton
                    title="Logout"
                    ariaLabel="Logout"
                    dark
                    onClick={() => { setSessionPropertyId(''); onSessionEnd(); }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H9" />
                    </svg>
                  </IconButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {error && <div className="rounded-2xl border border-rose-300 bg-rose-50 text-rose-700 p-4 text-sm font-semibold">{error}</div>}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="Total Brands Engaged" value={kpis.totalBrands} accent="border-amber-300 bg-gradient-to-br from-amber-100 to-yellow-100" />
          <KpiCard title="Active Deals" value={kpis.activeDeals} accent="border-amber-300 bg-gradient-to-br from-yellow-100 to-orange-100" />
          <KpiCard title="Visits Completed" value={kpis.visitsCompleted} accent="border-amber-300 bg-gradient-to-br from-amber-50 to-amber-200" />
          <KpiCard title="Stores Opened" value={kpis.storesOpened} accent="border-amber-300 bg-gradient-to-br from-orange-100 to-amber-100" />
          <KpiCard title="Total Updates" value={kpis.totalUpdates} accent="border-amber-300 bg-gradient-to-br from-yellow-50 to-orange-200" />
        </section>

        <PropertySummary property={property} />

        <section className="mx-auto max-w-[1520px] rounded-2xl border border-amber-400 bg-white p-6 shadow-sm">
          <h3 className="portal-heading text-3xl font-bold text-[#7a5916] text-center">Activity Table</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[2.2fr_1.1fr_1.1fr_1.1fr_1fr_1fr_auto] items-end">
            <div>
              <label className="mb-1 block text-sm font-bold text-black">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search across all columns"
                className="w-full rounded-lg border border-amber-400 px-3 py-2 text-black placeholder:text-black/60 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-black">Brand</label>
              <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="w-full rounded-lg border border-amber-400 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-amber-200">
                {brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-black">Activity</label>
              <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} className="w-full rounded-lg border border-amber-400 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-amber-200">
                {activityOptions.map((activity) => <option key={activity} value={activity}>{activity}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-black">Updated By</label>
              <select value={updatedByFilter} onChange={(e) => setUpdatedByFilter(e.target.value)} className="w-full rounded-lg border border-amber-400 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-amber-200">
                {updatedByOptions.map((updatedBy) => <option key={updatedBy} value={updatedBy}>{updatedBy}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-black">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-lg border border-amber-400 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-black">To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-lg border border-amber-400 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </div>
            <button
              type="button"
              className="h-[42px] rounded-lg border border-amber-500 bg-amber-50 px-3 py-2 text-sm font-bold text-black hover:bg-amber-100"
              onClick={() => {
                setSearch('');
                setBrandFilter('All');
                setActivityFilter('All');
                setUpdatedByFilter('All');
                setFromDate('');
                setToDate('');
              }}
            >
              Clear Filters
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-amber-400">
            <table id="property-activity-table" className="w-full min-w-[980px] border-collapse border border-amber-400 text-sm text-black">
              <thead className="bg-[#7a5916] text-white">
                <tr>
                  <th className="border border-amber-400 px-3 py-2 text-left">Date</th>
                  <th className="border border-amber-400 px-3 py-2 text-left">Brand</th>
                  <th className="border border-amber-400 px-3 py-2 text-left">Activity</th>
                  <th className="border border-amber-400 px-3 py-2 text-left">Remarks</th>
                  <th className="border border-amber-400 px-3 py-2 text-left">Updated By</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length ? (() => {
                  const groupPalette = ['bg-amber-50', 'bg-yellow-50', 'bg-orange-50', 'bg-stone-50', 'bg-amber-100'];
                  const groupColorByKey: Record<string, string> = {};
                  let nextColor = 0;
                  return filteredRows.map((row) => {
                    const key = row.proposalId;
                    if (!groupColorByKey[key]) {
                      groupColorByKey[key] = groupPalette[nextColor % groupPalette.length];
                      nextColor += 1;
                    }
                    const rowBg = groupColorByKey[key];
                    return (
                      <tr key={row.id} className={rowBg}>
                        <td className="border border-amber-300 px-3 py-2">{formatDateDisplay(row.date)}</td>
                        <td className="border border-amber-300 px-3 py-2">{row.brand}</td>
                        <td className="border border-amber-300 px-3 py-2 font-semibold">{row.activity}</td>
                        <td className="border border-amber-300 px-3 py-2">{row.remarks}</td>
                        <td className="border border-amber-300 px-3 py-2">{row.updatedBy}</td>
                      </tr>
                    );
                  });
                })() : (
                    <tr>
                      <td colSpan={5} className="border border-amber-300 px-3 py-3 text-center font-semibold">No data for selected filters.</td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      {isRefreshing && (
        <div className="fixed inset-0 z-[70] bg-black/20 flex items-center justify-center">
          <div className="bg-white px-6 py-5 rounded-lg shadow-lg flex flex-col items-center gap-3 border border-amber-300">
            <div className="h-10 w-10 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
            <p className="text-sm text-black font-semibold">Refreshing dashboard...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyPortalView;
