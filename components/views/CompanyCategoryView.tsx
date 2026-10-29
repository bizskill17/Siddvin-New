import React, { useState } from 'react';
import Button from '../common/Button';
import ListPageToolbar from '../common/ListPageToolbar';
import ExportIconButton from '../common/ExportIconButton';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import { downloadTableAsPdf, exportRowsToCsv } from '../common/exportUtils';
import { Brand } from '../../types';

interface CompanyCategoryViewProps {
  mode: 'company' | 'category' | 'both';
  companyOptions: string[];
  categoryOptions: string[];
  brands: Brand[];
  onAddCompany: (value: string) => Promise<void> | void;
  onAddCategory: (value: string) => Promise<void> | void;
  onEditCompany?: (oldValue: string, newValue: string) => Promise<void> | void;
  onEditCategory?: (oldValue: string, newValue: string) => Promise<void> | void;
  onRemoveCompany: (value: string) => Promise<void> | void;
  onRemoveCategory: (value: string) => Promise<void> | void;
  onBack?: () => void;
}

const CompanyCategoryView: React.FC<CompanyCategoryViewProps> = (props) => (
  <div className="space-y-6">
    {(['company', 'category'] as const).filter(kind => props.mode === 'both' || props.mode === kind).map(kind => <MasterTable key={kind} kind={kind} {...props} />)}
  </div>
);

const MasterTable: React.FC<CompanyCategoryViewProps & { kind: 'company' | 'category' }> = ({ kind, companyOptions, categoryOptions, brands, onAddCompany, onAddCategory, onEditCompany, onEditCategory, onRemoveCompany, onRemoveCategory }) => {
  const title = kind === 'company' ? 'Company' : 'Category';
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ original: string | null; value: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const options = kind === 'company' ? companyOptions : categoryOptions;
  const visible = options.filter(name => name.toLowerCase().includes(search.trim().toLowerCase()));
  const linked = (name: string) => brands.filter(brand => (kind === 'company' ? brand.companyName || '' : brand.category || '').trim().toLowerCase() === name.trim().toLowerCase());
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor?.value.trim() || busy) return;
    setBusy(true);
    try {
      if (editor.original !== null) await (kind === 'company' ? onEditCompany : onEditCategory)?.(editor.original, editor.value.trim());
      else await (kind === 'company' ? onAddCompany : onAddCategory)(editor.value.trim());
      setEditor(null);
    } finally { setBusy(false); }
  };
  return <section>
    <ListPageToolbar title={title}>
      <input type="text" aria-label={`Search ${title.toLowerCase()}`} placeholder={`Search ${title.toLowerCase()}...`} value={search} onChange={event => setSearch(event.target.value)} />
      <ExportIconButton kind="excel" onClick={() => exportRowsToCsv(kind, kind === 'company' ? ['Company Name'] : ['Category', 'Brands'], visible.map(name => kind === 'company' ? [name] : [name, linked(name).length]))} />
      <ExportIconButton kind="pdf" onClick={() => downloadTableAsPdf(`${kind}-master-table`, title)} />
      <Button onClick={() => setEditor({ original: null, value: '' })}>+ Add {title}</Button>
    </ListPageToolbar>
    {editor && <form onSubmit={save} className="sidvin-master-editor">
      <label htmlFor={`${kind}-name`}>{editor.original === null ? 'Add' : 'Edit'} {title} Name</label>
      <input id={`${kind}-name`} autoFocus required value={editor.value} onChange={event => setEditor({ ...editor, value: event.target.value })} />
      <Button type="submit" disabled={busy || !editor.value.trim()}>Save</Button>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => setEditor(null)}>Cancel</Button>
    </form>}
    <div className="overflow-x-auto rounded-lg border border-blue-200">
      <table id={`${kind}-master-table`} className="sidvin-category-table min-w-full">
        <thead><tr><th scope="col">{kind === 'company' ? 'Company Name' : 'Category'}</th>{kind === 'category' && <th scope="col">Brands</th>}<th scope="col">Actions</th></tr></thead>
        <tbody>{visible.map(name => <React.Fragment key={name}><tr>
          <td>{name}</td>
          {kind === 'category' && <td><button type="button" className="sidvin-category-brand-count" disabled={!linked(name).length} aria-expanded={selected === name} onClick={() => setSelected(selected === name ? null : name)}>{linked(name).length} brands</button></td>}
          <td><div className="flex items-center gap-2 whitespace-nowrap">
            <Button size="sm" onClick={() => setEditor({ original: name, value: name })}>Edit</Button>
            <Button size="sm" variant="danger" onClick={() => setRemoving(name)}>Remove</Button>
          </div></td>
        </tr>{selected === name && <tr><td colSpan={3}>Brands: {linked(name).map(brand => brand.name).join(' · ')}</td></tr>}</React.Fragment>)}
        {!visible.length && <tr><td colSpan={kind === 'category' ? 3 : 2}>No {kind === 'company' ? 'companies' : 'categories'} found.</td></tr>}
        </tbody>
      </table>
    </div>
    <DeleteConfirmationModal confirmText="Remove" isOpen={removing !== null} onClose={() => setRemoving(null)} title={`Remove ${title}?`} message={removing && linked(removing).length ? `${removing} is in use by ${linked(removing).length} brand(s). Removing the master entry will not remove it from linked brands. Continue?` : `Remove ${removing || title}?`} onConfirm={async () => { if (!removing || busy) return; setBusy(true); try { await (kind === 'company' ? onRemoveCompany : onRemoveCategory)(removing); setRemoving(null); } finally { setBusy(false); } }} isProcessing={busy} />
  </section>;
};
export default CompanyCategoryView;
