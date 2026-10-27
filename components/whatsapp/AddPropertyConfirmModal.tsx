import React, { useEffect, useMemo, useState } from 'react';
import Button from '../common/Button';
import { Property } from '../../types';
import { formatDateDisplay } from '../common/dateUtils';
import { getWhatsAppTemplates, normalizeWhatsAppNumber, WhatsAppTemplateInfo } from '../../services/dataService';

type NewProperty = Omit<Property, 'id' | 'serialNo' | 'createdAt' | 'updatedAt' | 'updatedBy'>;

interface AddPropertyConfirmModalProps {
  property: NewProperty;
  onConfirm: (sendWhatsApp: boolean) => void;
  onCancel: () => void;
}

const TEMPLATE_NAME = 'sidvin_property_registration';

/** Shown when "Add Property" is pressed: confirm the save and choose whether to send the WhatsApp welcome message. */
const AddPropertyConfirmModal: React.FC<AddPropertyConfirmModalProps> = ({ property, onConfirm, onCancel }) => {
  const [template, setTemplate] = useState<WhatsAppTemplateInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getWhatsAppTemplates()
      .then((data) => {
        if (cancelled) return;
        setConnected(data.configured && !data.remoteError);
        setTemplate(data.templates.find((t) => t.name === TEMPLATE_NAME) || null);
      })
      .catch((e: any) => { if (!cancelled) setLoadError(e?.message || 'Could not check WhatsApp templates.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const values = [property.address.trim(), property.siteVisitDate ? formatDateDisplay(property.siteVisitDate) : ''];
  const recipients = useMemo(
    () => property.contactPersons.map((c) => ({ name: c.name, mobile: c.mobile, to: normalizeWhatsAppNumber(c.mobile) })),
    [property.contactPersons],
  );
  const validRecipients = recipients.filter((r) => r.to);

  // Why the message can't be sent right now (first reason wins).
  const blockedReason = loading
    ? ''
    : loadError
      ? loadError
      : !connected
        ? 'Red Lava is not connected (see Master → WhatsApp Templates).'
        : !template
          ? 'The welcome message template is missing.'
          : template.remote?.status !== 'APPROVED'
            ? `The welcome message template is not approved by Meta yet (status: ${template.remote?.status ? template.remote.status.toLowerCase() : 'not submitted'}).`
            : !property.siteVisitDate
              ? 'Fill in the Site Visit Date to send this message.'
              : !validRecipients.length
                ? 'No contact person has a valid mobile number.'
                : '';
  const canSend = !loading && !blockedReason;

  useEffect(() => { setSendWhatsApp(canSend); }, [canSend]);

  const preview = template
    ? template.body.split(/(\{\{\d+\}\})/g).map((part, i) => {
        const m = part.match(/^\{\{(\d+)\}\}$/);
        if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
        const v = values[Number(m[1]) - 1];
        return <span key={i} className={`rounded px-1 font-medium ${v ? 'bg-amber-200' : 'bg-red-200 text-red-800'}`}>{v || 'missing'}</span>;
      })
    : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Add this property?</h2>
        <p className="mt-1 text-sm text-gray-700"><span className="font-semibold">{property.address || 'No address'}</span></p>

        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <label className={`flex items-start gap-3 ${canSend ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={sendWhatsApp}
              disabled={!canSend}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
            />
            <span>
              <span className="font-semibold text-gray-900">Send WhatsApp welcome message</span>
              <span className="block text-sm text-gray-600">
                {loading ? 'Checking the WhatsApp template...' : canSend
                  ? `To ${validRecipients.length} contact${validRecipients.length === 1 ? '' : 's'} after the property is saved.`
                  : blockedReason}
              </span>
            </span>
          </label>

          {recipients.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {recipients.map((r, i) => (
                <li key={i} className={r.to ? 'text-gray-800' : 'text-red-700'}>
                  {r.name || 'Unnamed contact'}: {r.to ? `+${r.to}` : `${r.mobile || 'no mobile'} (not a valid WhatsApp number, will be skipped)`}
                </li>
              ))}
            </ul>
          )}

          {preview && (
            <div className="mt-3 whitespace-pre-wrap rounded-lg border border-green-200 bg-[#e7ffdb] p-3 text-sm leading-relaxed text-gray-900">
              {preview}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>Go back</Button>
          <Button type="button" onClick={() => onConfirm(sendWhatsApp && canSend)} disabled={loading}>
            {sendWhatsApp && canSend ? 'Save & send WhatsApp' : 'Save property'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddPropertyConfirmModal;
