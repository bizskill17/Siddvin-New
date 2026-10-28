import React from 'react';
import { Property } from '../../types';
import Button from '../common/Button';
import PageHeader from '../common/PageHeader';

interface PropertyDetailViewProps {
  property: Property;
  statusLabel: string;
  onBack: () => void;
  onEdit: () => void;
}

const getPhotoSources = (rawUrl: string): string[] => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === 'drive.google.com' || parsed.hostname.endsWith('.drive.google.com')) {
      const fileId = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || parsed.searchParams.get('id');
      if (fileId) {
        const id = encodeURIComponent(fileId);
        return [
          `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
          `https://drive.google.com/uc?export=view&id=${id}`,
          rawUrl,
        ];
      }
    }
    return [rawUrl];
  } catch {
    return [rawUrl];
  }
};

const PropertyPhotoTile: React.FC<{ url: string; index: number }> = ({ url, index }) => {
  const sources = React.useMemo(() => getPhotoSources(url), [url]);
  const [sourceIndex, setSourceIndex] = React.useState(0);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setSourceIndex(0);
    setFailed(false);
  }, [url]);

  const tryNextSource = () => {
    if (sourceIndex + 1 < sources.length) setSourceIndex((current) => current + 1);
    else setFailed(true);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      {failed ? (
        <div className="flex h-52 items-center justify-center bg-gray-50 px-4 text-center text-sm text-gray-500">
          Photo preview unavailable
        </div>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="group block overflow-hidden">
          <img
            src={sources[sourceIndex]}
            alt={`Property photo ${index + 1}`}
            loading="lazy"
            onError={tryNextSource}
            className="h-52 w-full bg-gray-50 object-cover transition group-hover:scale-[1.02]"
          />
        </a>
      )}
      <a href={url} target="_blank" rel="noreferrer" className="block px-3 py-2 text-sm text-orange-700">Open photo {index + 1}</a>
    </div>
  );
};

const DetailField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 break-words text-sm text-gray-900">{value || '—'}</dd>
  </div>
);

const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({ property, statusLabel, onBack, onEdit }) => {
  const propertyCode = `P-${property.serialNo || '—'}`;
  const photos = (property.propertyPhotos || []).filter((url): url is string => !!url?.trim());
  const documents = [
    ...(property.drawings || []).filter((url): url is string => !!url?.trim()).map((url, index) => ({ label: `Drawing ${index + 1}`, url })),
    ...(property.cadDrawingUrl ? [{ label: 'CAD Drawing', url: property.cadDrawingUrl }] : []),
    ...(property.propertyPresentation ? [{ label: 'Property Presentation', url: property.propertyPresentation }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title={property.address || 'Property Details'}
        onBack={onBack}
        backLabel="Back to Properties"
        actions={<Button onClick={onEdit}>Edit Property</Button>}
      />

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">{propertyCode}</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">Property Summary</h2>
          </div>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">{statusLabel}</span>
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Address" value={property.address} />
          <DetailField label="Proposed Rent" value={property.proposedRent == null ? '—' : `₹ ${property.proposedRent.toLocaleString('en-IN')}`} />
          <DetailField label="Area" value={property.proposedArea == null ? '—' : `${property.proposedArea} sqft`} />
          <DetailField label="Floors" value={property.noOfFloors ?? '—'} />
          <DetailField label="Frontage" value={property.frontage} />
          <DetailField label="Service Fee Proposed" value={property.serviceFeeProposed} />
          <DetailField label="Fee Email Sent" value={property.propertyFeeEmailSent ? 'Yes' : 'No'} />
          <DetailField label="Fee Email Sent Date" value={property.propertyFeeEmailSentDate || '—'} />
          <DetailField label="Negotiation Required" value={property.propertyFeeNegotiationRequired ? 'Yes' : 'No'} />
          <DetailField label="Acceptance Email Date" value={property.propertyFeeAcceptanceEmailDate || '—'} />
          <DetailField label="MOU Signing Date" value={property.propertyFeePaperSigningDate || '—'} />
          <DetailField label="Follow-up Date" value={property.propertyFeeFollowUpDate || '—'} />
          <DetailField label="Follow-up Remarks" value={property.propertyFeeFollowUpRemarks} />
          <DetailField label="Notes" value={property.notes} />
          <DetailField label="Google Maps" value={property.googleMapsLink ? <a href={property.googleMapsLink} target="_blank" rel="noreferrer" className="text-orange-700 underline">Open location</a> : '—'} />
        </dl>
      </section>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Property Contacts</h2>
        {property.contactPersons?.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {property.contactPersons.map((contact, index) => (
              <div key={contact.id || index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">{contact.salutation ? `${contact.salutation} ` : ''}{contact.name || 'Contact'}</h3>
                {contact.designation && <p className="mt-1 text-sm text-gray-600">{contact.designation}</p>}
                <div className="mt-3 space-y-1 text-sm">
                  {contact.mobile && <p><span className="text-gray-500">Mobile:</span> {contact.mobile}</p>}
                  {contact.email && <p><span className="text-gray-500">Email:</span> <a className="text-orange-700 underline" href={`mailto:${contact.email}`}>{contact.email}</a></p>}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No contacts added.</p>}
      </section>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Property Photos</h2>
        {photos.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((url, index) => <PropertyPhotoTile key={url + index} url={url} index={index} />)}
          </div>
        ) : <p className="text-sm text-gray-500">No property photos added.</p>}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Drawings and Documents</h2>
        {documents.length ? (
          <ul className="divide-y divide-gray-200">
            {documents.map((document) => (
              <li key={document.label + document.url} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-gray-800">{document.label}</span>
                <a href={document.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-orange-700 underline">Open document</a>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500">No drawings or documents added.</p>}
      </section>
    </div>
  );
};

export default PropertyDetailView;
