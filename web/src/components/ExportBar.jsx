import { useState } from 'react';
import { api } from '../api.js';

function leadsToTsv(leads) {
  const head = ['Bedrijfsnaam', 'Branche', 'Plaats', 'Provincie', 'Telefoon', 'E-mail', 'Website', 'Score', 'Reden'];
  const rows = leads.map((l) =>
    [l.companyName, l.branche, l.city, l.province, l.phone, l.email, l.website,
     l.hasWebsite ? l.websiteScore : 'geen', l.reason]
      .map((v) => (v == null ? '' : String(v).replace(/\t/g, ' '))).join('\t')
  );
  return [head.join('\t'), ...rows].join('\n');
}

export default function ExportBar({ filters, leads }) {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(leadsToTsv(leads));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const btn = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a className={btn} href={api.exportUrl('csv', filters)}>⬇ CSV</a>
      <a className={btn} href={api.exportUrl('xlsx', filters)}>⬇ Excel</a>
      <button className={btn} onClick={copyAll} disabled={!leads.length}>
        {copied ? 'Gekopieerd ✓' : '⧉ Kopieer alles'}
      </button>
    </div>
  );
}
