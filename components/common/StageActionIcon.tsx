import React from 'react';

export type StageActionIconName = 'proposal' | 'followUp' | 'schedule' | 'visit' | 'terms' | 'agreement' | 'invoice' | 'photos' | 'mail' | 'negotiate' | 'mailCheck';

/** One small outline icon per next-step action in the proposal lists. */
const StageActionIcon: React.FC<{ name: StageActionIconName; className?: string }> = ({ name, className = 'w-4 h-4' }) => {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };
  switch (name) {
    case 'proposal': // pencil: complete the draft
      return <svg {...common}><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" /><path d="M13.5 6.5l3 3" /></svg>;
    case 'followUp': // phone: call / follow up
      return <svg {...common}><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5l5 2v4a2 2 0 0 1-2 2a16 16 0 0 1-15-15a2 2 0 0 1 2-2" /></svg>;
    case 'schedule': // calendar with plus: schedule a visit
      return <svg {...common}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M16 3v4M8 3v4M4 11h16M12 14v4M10 16h4" /></svg>;
    case 'visit': // map pin: record the site visit
      return <svg {...common}><path d="M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.2" /></svg>;
    case 'terms': // document with lines: terms
      return <svg {...common}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
    case 'agreement': // document with tick: agreement signed / store opened
      return <svg {...common}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 15l2 2l4-4" /></svg>;
    case 'photos': // picture: add property photos / files
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" /><path d="M21 16l-5-5l-9 8" /></svg>;
    case 'mail': // envelope: send the service fee email
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6l9-6" /></svg>;
    case 'negotiate': // two speech bubbles: negotiation
      return <svg {...common}><path d="M4 15V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7z" /><path d="M16 9h2a2 2 0 0 1 2 2v9l-3-3h-5a2 2 0 0 1-2-2v-2" /></svg>;
    case 'mailCheck': // envelope with tick: acceptance email received
      return <svg {...common}><path d="M12 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" /><path d="M3 7l9 6l9-6M15 19l2 2l4-4" /></svg>;
    case 'invoice': // rupee: brand fees / invoice
    default:
      return <svg {...common}><path d="M7 5h10M7 9h10M7 5h3.5a4 4 0 0 1 0 8H7l7 6" /></svg>;
  }
};

export default StageActionIcon;
