import { useState } from 'react';

function scoreBadge(lead) {
  if (!lead.hasWebsite) return { text: 'Geen site', cls: 'bg-slate-200 text-slate-700' };
  const s = lead.websiteScore;
  if (s < 40) return { text: `${s}/100`, cls: 'bg-rose-100 text-rose-700' };
  if (s < 55) return { text: `${s}/100`, cls: 'bg-amber-100 text-amber-700' };
  return { text: `${s}/100`, cls: 'bg-emerald-100 text-emerald-700' };
}

function leadToText(l) {
  return [
    l.companyName, l.branche, `${l.city || ''}${l.province ? ', ' + l.province : ''}`,
    l.phone && `Tel: ${l.phone}`, l.email && `E-mail: ${l.email}`, l.website && `Web: ${l.website}`,
    `Score: ${l.hasWebsite ? l.websiteScore + '/100' : 'geen website'}`,
    `Reden: ${l.reason}`, l.motivation && `Motivatie: ${l.motivation}`,
  ].filter(Boolean).join('\n');
}

export default function LeadCard({ lead }) {
  const [copied, setCopied] = useState(false);
  const badge = scoreBadge(lead);
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${lead.companyName} ${lead.city || ''}`)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(leadToText(lead));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold leading-tight text-slate-900">{lead.companyName}</h3>
          <p className="text-sm text-slate-500">
            {lead.branche} · {lead.city}{lead.province ? `, ${lead.province}` : ''}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badge.cls}`}>{badge.text}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(lead.reasonTags || []).slice(0, 4).map((t, i) => (
          <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{t}</span>
        ))}
      </div>

      {lead.motivation && (
        <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm leading-relaxed text-slate-700">{lead.motivation}</p>
      )}

      <dl className="mt-3 space-y-1 text-sm">
        {lead.phone && <div className="flex gap-2"><dt className="w-16 text-slate-400">Tel</dt><dd className="text-slate-700">{lead.phone}</dd></div>}
        {lead.email && <div className="flex gap-2"><dt className="w-16 text-slate-400">E-mail</dt><dd className="truncate text-slate-700">{lead.email}</dd></div>}
        <div className="flex gap-2"><dt className="w-16 text-slate-400">Website</dt><dd className="truncate text-slate-700">{lead.website || '—'}</dd></div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {lead.website && (
          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Website openen
          </a>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Google Maps
        </a>
        <button onClick={copy} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          {copied ? 'Gekopieerd ✓' : 'Kopiëren'}
        </button>
        <span className="ml-auto text-[11px] text-slate-400">
          {lead.lastChecked ? new Date(lead.lastChecked).toLocaleDateString('nl-NL') : ''}
        </span>
      </div>
    </div>
  );
}
