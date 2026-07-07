export default function GenerateButton({ onGenerate, generating, progress }) {
  const pct = progress?.target ? Math.min(100, Math.round((progress.found / progress.target) * 100)) : 0;
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <button
        onClick={onGenerate}
        disabled={generating}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {generating ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Zoeken… {progress?.found ?? 0}/{progress?.target ?? 50}
          </>
        ) : (
          <>⚡ Genereer 50 Leads</>
        )}
      </button>
      {generating && (
        <div className="min-w-[160px] flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-500">{progress?.scanned ?? 0} bedrijven bekeken</div>
        </div>
      )}
    </div>
  );
}
