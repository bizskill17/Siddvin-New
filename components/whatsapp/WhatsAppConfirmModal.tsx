import React, { useEffect, useState } from 'react';
import Button from '../common/Button';
import { previewWhatsApp, WhatsAppEvent, WhatsAppPreviewSide } from '../../services/dataService';

export type WhatsAppSide = 'property' | 'brand';

interface WhatsAppConfirmModalProps {
  /** e.g. "Add this brand?" */
  title: string;
  /** e.g. the brand name or property address */
  subtitle?: string;
  event: WhatsAppEvent;
  /** The form data about to be saved (not saved yet). */
  record: unknown;
  /** Whether sendable messages start ticked. */
  defaultSend: boolean;
  onConfirm: (sides: WhatsAppSide[]) => void;
  onCancel: () => void;
}

/**
 * Shown before saving a form that has WhatsApp messages attached: lists who would get which message,
 * with a preview and a checkbox per side (property / brand). Saving happens only after confirming.
 */
const WhatsAppConfirmModal: React.FC<WhatsAppConfirmModalProps> = ({ title, subtitle, event, record, defaultSend, onConfirm, onCancel }) => {
  const [sides, setSides] = useState<WhatsAppPreviewSide[]>([]);
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    previewWhatsApp(event, record)
      .then((result) => {
        if (cancelled) return;
        setSides(result);
        setChosen(Object.fromEntries(result.map((s) => [s.side, defaultSend && s.canSend])));
      })
      .catch((e: any) => { if (!cancelled) setLoadError(e?.message || 'Could not prepare the WhatsApp messages.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // The record is fixed for the life of the popup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  const selected = sides.filter((s) => s.canSend && chosen[s.side]).map((s) => s.side);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm font-semibold text-gray-700">{subtitle}</p>}

        {loading && <p className="mt-4 text-sm text-gray-600">Preparing WhatsApp messages...</p>}
        {loadError && (
          <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            WhatsApp messages can't be sent for this: {loadError} You can still save.
          </p>
        )}

        {sides.map((s) => {
          const first = s.recipients[0];
          const others = s.recipients.slice(1);
          const expanded = !!showAll[s.side];
          return (
            <div key={s.side} className="mt-4 rounded-lg border border-gray-200 p-4">
              <label className={`flex items-start gap-3 ${s.canSend ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}>
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={!!chosen[s.side] && s.canSend}
                  disabled={!s.canSend}
                  onChange={(e) => setChosen((c) => ({ ...c, [s.side]: e.target.checked }))}
                />
                <span>
                  <span className="font-semibold text-gray-900">Send WhatsApp to {s.label.toLowerCase()}</span>
                  <span className="block text-sm text-gray-600">
                    {s.canSend
                      ? `${s.recipients.length} recipient${s.recipients.length === 1 ? '' : 's'}: ${s.recipients.map((r) => `${r.name || 'contact'} (+${r.to})`).join(', ')}`
                      : s.blockedReason}
                  </span>
                  {s.skipped.map((k, i) => <span key={i} className="block text-xs text-red-700">Skipped: {k}</span>)}
                </span>
              </label>

              {first && (
                <div className="mt-3 whitespace-pre-wrap rounded-lg border border-green-200 bg-[#e7ffdb] p-3 text-sm leading-relaxed text-gray-900">
                  {first.text}
                </div>
              )}
              {others.length > 0 && (
                <>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-orange-800 underline"
                    onClick={() => setShowAll((v) => ({ ...v, [s.side]: !expanded }))}
                  >
                    {expanded ? 'Hide other messages' : `Show the other ${others.length} message${others.length === 1 ? '' : 's'}`}
                  </button>
                  {expanded && others.map((r, i) => (
                    <div key={i} className="mt-2 whitespace-pre-wrap rounded-lg border border-green-200 bg-[#e7ffdb] p-3 text-sm leading-relaxed text-gray-900">
                      <p className="mb-1 text-xs font-semibold text-gray-600">To {r.name || 'contact'} (+{r.to})</p>
                      {r.text}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>Go back</Button>
          <Button type="button" onClick={() => onConfirm(selected)} disabled={loading}>
            {selected.length ? 'Save & send WhatsApp' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConfirmModal;
