import React, { useEffect, useState } from 'react';
import Button from '../common/Button';
import PageHeader from '../common/PageHeader';
import * as dataService from '../../services/dataService';

interface ViewSettingsViewProps {
  initialSettings: dataService.ViewSettings;
  canEdit: boolean;
  onSaved: (settings: dataService.ViewSettings) => void;
  onBack: () => void;
}

const themeOptions: Array<{
  id: dataService.ViewColorTheme;
  name: string;
  description: string;
  sidebar: string;
  accent: string;
  surface: string;
}> = [
  { id: 'terracotta', name: 'Terracotta', description: 'Warm and familiar', sidebar: '#873609', accent: '#c64d12', surface: '#fbf7f1' },
  { id: 'ocean', name: 'Ocean Blue', description: 'Calm and corporate', sidebar: '#15364f', accent: '#147f89', surface: '#f3f7fa' },
  { id: 'forest', name: 'Forest Green', description: 'Natural and grounded', sidebar: '#174536', accent: '#327858', surface: '#f3f8f4' },
  { id: 'plum', name: 'Plum', description: 'Distinct and understated', sidebar: '#4c3155', accent: '#8b557e', surface: '#faf6fa' },
];

const compressLogo = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Upload a PNG, JPEG, or WebP image.');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('The logo file must be 5 MB or smaller.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loaded = new Image();
      loaded.onload = () => resolve(loaded);
      loaded.onerror = () => reject(new Error('The selected image could not be opened.'));
      loaded.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image compression is not available in this browser.');

    for (const maxWidth of [560, 440, 340, 260, 200]) {
      const scale = Math.min(1, maxWidth / image.naturalWidth, 240 / image.naturalHeight);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46]) {
        const dataUrl = canvas.toDataURL('image/webp', quality);
        if (dataUrl.length <= 46000) return dataUrl;
      }
    }
    throw new Error('This logo could not be compressed enough. Try a simpler or smaller image.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const ViewSettingsView: React.FC<ViewSettingsViewProps> = ({ initialSettings, canEdit, onSaved, onBack }) => {
  const [logoDataUrl, setLogoDataUrl] = useState(initialSettings.logoDataUrl);
  const [orgName, setOrgName] = useState(initialSettings.orgName || 'Sidvin');
  const [theme, setTheme] = useState<dataService.ViewColorTheme>(initialSettings.theme);
  const [saving, setSaving] = useState(false);
  const [logoName, setLogoName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLogoDataUrl(initialSettings.logoDataUrl);
    setOrgName(initialSettings.orgName || 'Sidvin');
    setTheme(initialSettings.theme);
  }, [initialSettings]);

  const handleLogoSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    try {
      const compressed = await compressLogo(file);
      setLogoDataUrl(compressed);
      setLogoName(file.name);
    } catch (e: any) {
      setError(e?.message || 'Could not process this logo.');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await dataService.saveViewSettings(logoDataUrl, theme, orgName);
      onSaved(result.settings);
      setLogoName('');
      setMessage('View settings saved for the Sidvin team.');
    } catch (e: any) {
      setError(e?.message || 'Could not save view settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="View Settings"
      />

      {!canEdit && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Only Admin and Super Admin users can change the shared logo and color theme.
        </div>
      )}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Organization Name</h2>
        <p className="mt-1 text-sm text-gray-600">This name is shown at the top of the left menu.</p>
        <label htmlFor="organization-name" className="mt-4 block text-sm font-semibold text-gray-700">Name</label>
        <input
          id="organization-name"
          type="text"
          maxLength={80}
          value={orgName}
          onChange={(event) => setOrgName(event.target.value)}
          disabled={!canEdit || saving}
          className="mt-1 block w-full max-w-xl rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Enter organization name"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Company Logo</h2>
            <p className="mt-1 text-sm text-gray-600">The logo appears in the top-right workspace header.</p>
          </div>

          <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Uploaded company logo preview" className="max-h-24 max-w-full object-contain" />
            ) : (
              <div className="text-center text-sm text-gray-600">
                <div className="mb-2 text-2xl" aria-hidden="true">▧</div>
                <p>No custom logo uploaded</p>
              </div>
            )}
          </div>

          {logoName && <p className="mt-2 truncate text-xs text-gray-600">Selected: {logoName}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <label className={`inline-flex cursor-pointer items-center justify-center rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 ${!canEdit || saving ? 'pointer-events-none opacity-50' : ''}`}>
              Upload Logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => { void handleLogoSelection(event); }}
                disabled={!canEdit || saving}
              />
            </label>
            {logoDataUrl && (
              <Button type="button" variant="secondary" onClick={() => { setLogoDataUrl(''); setLogoName(''); }} disabled={!canEdit || saving}>
                Remove Logo
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-500">PNG, JPEG, or WebP. The image is resized before saving.</p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Color Theme</h2>
            <p className="mt-1 text-sm text-gray-600">Choose the shared color style for the team workspace.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={theme === option.id}
                disabled={!canEdit || saving}
                onClick={() => setTheme(option.id)}
                className={`view-theme-option rounded-lg border p-3 text-left transition ${theme === option.id ? 'border-orange-700 ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-400'} ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="mb-3 flex h-12 overflow-hidden rounded-md border border-gray-200">
                  <span className="w-1/3" style={{ backgroundColor: option.sidebar }} />
                  <span className="flex-1" style={{ backgroundColor: option.surface }} />
                  <span className="w-1/5" style={{ backgroundColor: option.accent }} />
                </div>
                <span className="block text-sm font-semibold text-gray-900">{option.name}</span>
                <span className="block text-xs text-gray-600">{option.description}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</p>}

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onBack}>Cancel</Button>
        <Button type="button" onClick={() => { void saveSettings(); }} disabled={!canEdit || saving}>
          {saving ? 'Saving…' : 'Save View Settings'}
        </Button>
      </div>
    </div>
  );
};

export default ViewSettingsView;
