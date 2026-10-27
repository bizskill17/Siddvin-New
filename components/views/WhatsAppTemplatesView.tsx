import React, { useCallback, useEffect, useState } from 'react';
import Button from '../common/Button';
import PageHeader from '../common/PageHeader';
import {
  getWhatsAppTemplates,
  RedLavaSettings,
  saveRedLavaSettings,
  submitWhatsAppTemplate,
  WhatsAppTemplateInfo,
  WhatsAppTemplatesResult,
} from '../../services/dataService';

interface WhatsAppTemplatesViewProps {
  onBack?: () => void;
}

const statusStyle = (status: string | undefined): { label: string; className: string } => {
  switch (status) {
    case 'APPROVED':
      return { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-300' };
    case 'REJECTED':
      return { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-300' };
    case 'PENDING':
    case 'IN_APPEAL':
      return { label: 'Pending review', className: 'bg-amber-100 text-amber-800 border-amber-300' };
    case undefined:
    case '':
      return { label: 'Not submitted', className: 'bg-gray-100 text-gray-700 border-gray-300' };
    default:
      return { label: status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' '), className: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
};

/** Renders the template body with {{n}} shown as the example value, highlighted. */
const BodyPreview: React.FC<{ template: WhatsAppTemplateInfo }> = ({ template }) => {
  const parts = template.body.split(/(\{\{\d+\}\})/g);
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed rounded-lg bg-[#e7ffdb] border border-green-200 p-3 text-gray-900">
      {parts.map((part, i) => {
        const m = part.match(/^\{\{(\d+)\}\}$/);
        if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
        const n = Number(m[1]);
        return (
          <span
            key={i}
            title={`{{${n}}}: ${template.fields[n - 1] || ''}`}
            className="rounded bg-amber-200 px-1 font-medium"
          >
            {template.examples[n - 1] || `{{${n}}}`}
          </span>
        );
      })}
    </div>
  );
};

/** Red Lava connection: the API key is write-only; only its last 4 characters are ever shown. */
const ConnectionPanel: React.FC<{
  settings: RedLavaSettings;
  canEdit: boolean;
  remoteError: string | null;
  onSaved: () => Promise<void>;
}> = ({ settings, canEdit, remoteError, onSaved }) => {
  const connected = settings.source !== 'none';
  const [editing, setEditing] = useState(!connected);
  const [apiKey, setApiKey] = useState('');
  const [phoneId, setPhoneId] = useState(settings.phoneId);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { setPhoneId(settings.phoneId); }, [settings.phoneId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const res = await saveRedLavaSettings(apiKey, phoneId);
      setApiKey('');
      if (res.checkError) {
        setResult({ ok: false, text: `Saved, but Red Lava did not accept it: ${res.checkError}` });
      } else {
        setResult({ ok: true, text: `Connected. Red Lava has ${res.templateCount} template(s) in this account.` });
        setEditing(false);
      }
      await onSaved();
    } catch (err: any) {
      setResult({ ok: false, text: err?.message || 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  const healthy = connected && !remoteError;
  return (
    <section className={`rounded-lg border p-4 ${healthy ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm">
          <p className="font-semibold text-gray-900">
            Red Lava connection: {healthy ? 'Connected' : connected ? 'Saved, but not working' : 'Not connected'}
          </p>
          {connected && (
            <p className="mt-1 text-gray-700">
              API key {settings.keyHint}
              {settings.phoneId ? ` · Phone ID ${settings.phoneId}` : ' · Phone ID not set'}
              {settings.source === 'config' ? ' · set in the server config file' : ''}
              {settings.updatedBy ? ` · saved by ${settings.updatedBy}` : ''}
            </p>
          )}
          {remoteError && <p className="mt-1 text-red-700">{remoteError}</p>}
          {!canEdit && !connected && <p className="mt-1 text-gray-700">Ask an Admin to connect Red Lava.</p>}
        </div>
        {canEdit && settings.source !== 'config' && connected && !editing && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Change</Button>
        )}
      </div>

      {canEdit && settings.source !== 'config' && editing && (
        <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_auto] items-end">
          <label className="text-sm">
            <span className="block font-medium text-gray-800 mb-1">API key</span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={connected ? 'Leave blank to keep the current key' : 'Paste your Red Lava API key'}
              required={!connected}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </label>
          <label className="text-sm">
            <span className="block font-medium text-gray-800 mb-1">Phone ID</span>
            <input
              inputMode="numeric"
              value={phoneId}
              onChange={(e) => setPhoneId(e.target.value.replace(/\D/g, ''))}
              placeholder="From Connected Accounts"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? 'Checking...' : 'Save & test'}</Button>
            {connected && <Button type="button" variant="secondary" onClick={() => { setEditing(false); setApiKey(''); }}>Cancel</Button>}
          </div>
          <p className="sm:col-span-3 text-xs text-gray-600">
            The key is stored encrypted on the server and is never shown again after saving. The Phone ID is under your
            number in Red Lava &rarr; Connected Accounts.
          </p>
        </form>
      )}
      {result && <p className={`mt-2 text-sm ${result.ok ? 'text-green-700' : 'text-red-700'}`}>{result.text}</p>}
    </section>
  );
};

const WhatsAppTemplatesView: React.FC<WhatsAppTemplatesViewProps> = ({ onBack }) => {
  const [data, setData] = useState<WhatsAppTemplatesResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyName, setBusyName] = useState('');
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setData(await getWhatsAppTemplates());
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load templates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (t: WhatsAppTemplateInfo) => {
    const ok = window.confirm(
      `Submit "${t.title}" to Meta for approval?\n\nTemplate name: ${t.name}\nCategory: ${t.category}\n\n` +
      'Once submitted, the wording cannot be edited; it can only be deleted in Red Lava and submitted again.',
    );
    if (!ok) return;
    setBusyName(t.name);
    setMessages((m) => ({ ...m, [t.name]: { ok: true, text: 'Submitting...' } }));
    try {
      const text = await submitWhatsAppTemplate(t.name);
      setMessages((m) => ({ ...m, [t.name]: { ok: true, text } }));
      await load();
    } catch (e: any) {
      setMessages((m) => ({ ...m, [t.name]: { ok: false, text: e?.message || 'Submission failed.' } }));
    } finally {
      setBusyName('');
    }
  };

  const templates = data?.templates || [];
  const counts = templates.reduce<Record<string, number>>((acc, t) => {
    const key = statusStyle(t.remote?.status).label;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <PageHeader
        title="WhatsApp Templates"
        onBack={onBack}
        backLabel="Back to Dashboard"
        actions={<Button onClick={() => void load()} disabled={isLoading}>{isLoading ? 'Loading...' : 'Refresh status'}</Button>}
      />

      {loadError && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{loadError}</div>}

      {data && (
        <ConnectionPanel
          settings={data.settings}
          canEdit={data.canEditSettings}
          remoteError={data.remoteError}
          onSaved={load}
        />
      )}
      {data?.configured && !data.canSubmit && (
        <div className="rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-700">
          Only Admin or Super Admin can submit templates.
        </div>
      )}

      {templates.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {Object.entries(counts).map(([label, n]) => (
            <span key={label} className="rounded-full border border-gray-300 bg-white px-3 py-1">{label}: <b>{n}</b></span>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {templates.map((t) => {
          const st = statusStyle(t.remote?.status);
          const msg = messages[t.name];
          const isOpen = !!expanded[t.name];
          return (
            <section key={t.name} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <code>{t.name}</code> · {t.language} · {t.category}
                    {t.remote?.category && t.remote.category !== t.category ? ` (Meta set: ${t.remote.category})` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.className}`}>{st.label}</span>
                  <Button size="sm" variant="secondary" onClick={() => setExpanded((e) => ({ ...e, [t.name]: !isOpen }))}>
                    {isOpen ? 'Hide' : 'Preview'}
                  </Button>
                  {data?.canSubmit && !t.remote && (
                    <Button size="sm" onClick={() => void submit(t)} disabled={!!busyName}>
                      {busyName === t.name ? 'Submitting...' : 'Submit to Meta'}
                    </Button>
                  )}
                </div>
              </div>

              {t.remote?.status === 'REJECTED' && t.remote.reason && (
                <p className="mt-2 text-sm text-red-700">Rejection reason: {t.remote.reason}</p>
              )}
              {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</p>}

              {isOpen && (
                <div className="mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]">
                  <BodyPreview template={t} />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-800 mb-1">Placeholders</p>
                    <ol className="space-y-1">
                      {t.fields.map((f, i) => (
                        <li key={i} className={f.includes('no field yet') ? 'text-red-700' : 'text-gray-700'}>
                          <code className="text-xs">{`{{${i + 1}}}`}</code> {f}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default WhatsAppTemplatesView;
