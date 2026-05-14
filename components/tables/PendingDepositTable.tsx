import React from 'react';
import { DepositStage, Proposal, Property, Brand, TermSheetAgreement } from '../../types';
import Button from '../common/Button';
import DateInput from '../common/DateInput';
import ExportIconButton from '../common/ExportIconButton';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';
import Input from '../common/Input';

interface PendingDepositRow {
  proposal: Proposal;
  propertyAddress: string;
  brandName: string;
  totalDeposit: number;
  depositReceived: number;
  nextDepositName: string;
  nextDepositAmount: number;
  stageReceivedAmount: number;
  remainingAmount: number;
  termSheet: TermSheetAgreement;
  nextDepositStageId: string;
}

interface PendingDepositTableProps {
  proposals: Proposal[];
  properties: Property[];
  brands: Brand[];
  termSheetAgreements: TermSheetAgreement[];
  onUpdateDepositReceived: (termSheet: TermSheetAgreement, depositStageId: string, receiptDate: string, receiptAmount: number) => void;
  toolbarInline?: boolean;
  toolbarActions?: React.ReactNode;
}

interface ReceiptFormState {
  row: PendingDepositRow;
  receiptDate: string;
  receiptAmount: string;
  error: string;
}

const getStageReceivedAmount = (stage: DepositStage): number => {
  if (stage.receipts && stage.receipts.length > 0) {
    return stage.receipts.reduce((sum, receipt) => sum + (receipt.receiptAmount || 0), 0);
  }

  const fallbackAmount = stage.receivedAmount ?? (stage.received ? (stage.amount ?? 0) : 0);
  return Math.max(0, fallbackAmount);
};

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
  const [receiptForm, setReceiptForm] = React.useState<ReceiptFormState | null>(null);

  const rows: PendingDepositRow[] = React.useMemo(() => {
    const result: PendingDepositRow[] = [];
    for (const ts of termSheetAgreements) {
      const stages = ts.depositStages || [];
      const totalDeposit = stages.reduce((sum, ds) => sum + (ds.amount || 0), 0);
      const depositReceived = stages.reduce((sum, ds) => sum + getStageReceivedAmount(ds), 0);
      if (depositReceived >= totalDeposit && totalDeposit > 0) continue;

      let nextDepositName = 'N/A';
      let nextDepositAmount = 0;
      let nextDepositStageId = '';
      let runningReceived = depositReceived;
      let foundNext = false;

      for (const ds of stages) {
        const stageAmount = ds.amount || 0;
        if (runningReceived >= stageAmount && stageAmount > 0) {
          runningReceived -= stageAmount;
        } else {
          nextDepositName = ds.stageName || 'N/A';
          nextDepositAmount = stageAmount - runningReceived;
          nextDepositStageId = ds.id;
          foundNext = true;
          break;
        }
      }

      if (!foundNext) continue;

      const proposal = proposals.find((p) => p.id === ts.proposalId);
      if (!proposal) continue;

      const property = properties.find((p) => p.id === proposal.propertyId);
      const brand = brands.find((b) => b.id === proposal.brandId);

      result.push({
        proposal,
        propertyAddress: property?.address || 'N/A',
        brandName: brand?.name || 'N/A',
        totalDeposit,
        depositReceived,
        nextDepositName,
        nextDepositAmount,
        stageReceivedAmount: depositReceived,
        remainingAmount: nextDepositAmount,
        termSheet: ts,
        nextDepositStageId,
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

  const handleUpdateReceipt = (row: PendingDepositRow) => {
    const defaultDate = new Date().toISOString().slice(0, 10);
    const currentStage = row.termSheet.depositStages.find((ds) => ds.id === row.nextDepositStageId);

    setReceiptForm({
      row,
      receiptDate: currentStage?.receiptDate || defaultDate,
      receiptAmount: row.remainingAmount > 0 ? String(row.remainingAmount) : '',
      error: '',
    });
  };

  const closeReceiptForm = () => setReceiptForm(null);

  const handleReceiptFormChange = (field: 'receiptDate' | 'receiptAmount', value: string) => {
    setReceiptForm((prev) => (prev ? { ...prev, [field]: value, error: '' } : prev));
  };

  const handleReceiptFormSubmit = () => {
    if (!receiptForm) return;

    const receiptDate = receiptForm.receiptDate.trim();
    const receiptAmount = Number(receiptForm.receiptAmount.replace(/,/g, '').trim());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(receiptDate)) {
      setReceiptForm((prev) => (prev ? { ...prev, error: 'Please enter a valid receipt date.' } : prev));
      return;
    }

    if (!Number.isFinite(receiptAmount) || receiptAmount <= 0) {
      setReceiptForm((prev) => (prev ? { ...prev, error: 'Please enter a valid receipt amount.' } : prev));
      return;
    }

    onUpdateDepositReceived(receiptForm.row.termSheet, receiptForm.row.nextDepositStageId, receiptDate, receiptAmount);
    closeReceiptForm();
  };

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
      {receiptForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="update-receipt-title">
          <div className="w-full max-w-2xl rounded-xl bg-[#ece8e3] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 id="update-receipt-title" className="text-xl font-semibold text-gray-900">Update Receipt</h3>
              </div>
              <button
                type="button"
                onClick={closeReceiptForm}
                className="text-2xl leading-none text-gray-500 hover:text-gray-700"
                aria-label="Close update receipt form"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DateInput
                id="receiptDate"
                label="Receipt Date"
                value={receiptForm.receiptDate}
                onChange={(e) => handleReceiptFormChange('receiptDate', e.target.value)}
                required
              />
              <Input
                id="receiptAmount"
                label="Receipt Amount"
                type="number"
                min="0"
                step="0.01"
                value={receiptForm.receiptAmount}
                onChange={(e) => handleReceiptFormChange('receiptAmount', e.target.value)}
                required
              />
            </div>
            {receiptForm.error && <p className="mt-1 text-sm font-medium text-red-600">{receiptForm.error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeReceiptForm}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleReceiptFormSubmit}>
                Save Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
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
                  <td className="whitespace-normal break-words max-w-[200px] px-3 py-2.5 text-sm text-black">{row.propertyAddress}</td>
                  <td className="whitespace-normal px-3 py-2.5 text-sm text-black">{row.brandName}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{row.totalDeposit.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{row.depositReceived.toLocaleString()}</td>
                  <td className="whitespace-normal px-3 py-2.5 text-sm text-black">{row.nextDepositName}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-black">{row.nextDepositAmount.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-center">
                    <Button size="sm" variant="primary" onClick={() => handleUpdateReceipt(row)}>
                      Update Receipt
                    </Button>
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
