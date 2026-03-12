import React from 'react';
import { Proposal, Property, Brand, TermSheetAgreement } from '../../types';
import Button from '../common/Button';
import ExportIconButton from '../common/ExportIconButton';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';

interface PendingDepositRow {
  proposal: Proposal;
  propertyAddress: string;
  brandName: string;
  totalDeposit: number;
  depositReceived: number;
  nextDepositName: string;
  nextDepositAmount: number;
  termSheet: TermSheetAgreement;
  nextDepositStageId: string;
}

interface PendingDepositTableProps {
  proposals: Proposal[];
  properties: Property[];
  brands: Brand[];
  termSheetAgreements: TermSheetAgreement[];
  onUpdateDepositReceived: (termSheet: TermSheetAgreement, depositStageId: string) => void;
  toolbarInline?: boolean;
  toolbarActions?: React.ReactNode;
}

const PendingDepositTable: React.FC<PendingDepositTableProps> = ({
  proposals,
  properties,
  brands,
  termSheetAgreements,
  onUpdateDepositReceived,
  toolbarInline = false,
  toolbarActions,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const rows: PendingDepositRow[] = React.useMemo(() => {
    const result: PendingDepositRow[] = [];
    for (const ts of termSheetAgreements) {
      const stages = ts.depositStages || [];
      const nextPending = stages.find(ds => !ds.received);
      if (!nextPending) continue;

      const proposal = proposals.find(p => p.id === ts.proposalId);
      if (!proposal) continue;

      const property = properties.find(p => p.id === proposal.propertyId);
      const brand = brands.find(b => b.id === proposal.brandId);

      const totalDeposit = stages.reduce((sum, ds) => sum + (ds.amount || 0), 0);
      const depositReceived = stages
        .filter(ds => ds.received)
        .reduce((sum, ds) => sum + (ds.amount || 0), 0);

      result.push({
        proposal,
        propertyAddress: property?.address || 'N/A',
        brandName: brand?.name || 'N/A',
        totalDeposit,
        depositReceived,
        nextDepositName: nextPending.stageName || 'N/A',
        nextDepositAmount: nextPending.amount || 0,
        termSheet: ts,
        nextDepositStageId: nextPending.id,
      });
    }
    return result;
  }, [proposals, properties, brands, termSheetAgreements]);

  const visibleRows = rows.filter((row) => {
    const text = [
      `Q-${row.proposal.serialNo || ''}`,
      row.propertyAddress,
      row.brandName,
      row.nextDepositName,
    ].join(' ').toLowerCase();
    return text.includes(searchTerm.trim().toLowerCase());
  });

  const toolbarClassName = `mb-4 flex flex-wrap items-center justify-end gap-2 ${toolbarInline ? 'sm:-mt-[4.25rem]' : ''}`;

  return (
    <div>
      <div className={toolbarClassName}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search deposits..."
          className="px-3 py-2 rounded-md border border-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <ExportIconButton
          kind="excel"
          onClick={() =>
            exportRowsToCsv(
              'pending_deposits',
              ['Proposal Code', 'Property Address', 'Brand Name', 'Total Deposit', 'Deposit Received', 'Next Deposit', 'Amount'],
              visibleRows.map((r) => [
                `Q-${r.proposal.serialNo || ''}`,
                r.propertyAddress,
                r.brandName,
                r.totalDeposit.toString(),
                r.depositReceived.toString(),
                r.nextDepositName,
                r.nextDepositAmount.toString(),
              ])
            )
          }
        />
        <ExportIconButton kind="pdf" onClick={() => downloadTableAsPdf('pending-deposit-table', 'Pending Deposits')} />
        {toolbarActions}
      </div>
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-black">
        <table id="pending-deposit-table" className="min-w-full divide-y divide-gray-300 border-collapse [&_th]:border [&_th]:border-black [&_td]:border [&_td]:border-black">
          <thead className="bg-orange-700 text-white">
            <tr>
              <th scope="col" className="py-2.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6 border-b border-black">
                Proposal Code
              </th>
              <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
                Property Address
              </th>
              <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
                Brand Name
              </th>
              <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
                Total Deposit
              </th>
              <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
                Deposit Received
              </th>
              <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
                Next Deposit
              </th>
              <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-white border-b border-black">
                Amount
              </th>
              <th scope="col" className="px-3 py-2.5 text-center text-sm font-semibold text-white border-b border-black">
                Update
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-[#ece8e3]">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">No pending deposits found.</td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={row.proposal.id}>
                  <td className="whitespace-nowrap py-2.5 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {`Q-${row.proposal.serialNo || ''}`}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{row.propertyAddress}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{row.brandName}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{row.totalDeposit.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{row.depositReceived.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{row.nextDepositName}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{row.nextDepositAmount.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      checked={false}
                      onChange={() => onUpdateDepositReceived(row.termSheet, row.nextDepositStageId)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingDepositTable;
