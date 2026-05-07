import { useMemo, useState } from 'react';
import { useStore, type Paper } from '../store/useStore';
import { FileText, Calendar, User, ExternalLink, Sparkles, Clock3, CircleArrowRight, Search, History, Trash2, RefreshCcw } from 'lucide-react';

const PaperHistory = () => {
  const { papers, selectedPaperId, setSelectedPaperId, setActiveReaderId, recentlyOpenedPaperIds, clearRecentlyOpenedPaperIds } = useStore();
  const [query, setQuery] = useState('');

  const historyItems = useMemo(() => [...papers].sort((a, b) => b.id - a.id), [papers]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return historyItems;

    return historyItems.filter((paper) => {
      const haystack = [paper.title, paper.authors, paper.domain, paper.topic, String(paper.year ?? '')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [historyItems, query]);

  const recentlyOpened = useMemo(() => {
    const seen = new Set<number>();
    return recentlyOpenedPaperIds
      .map((paperId) => papers.find((paper) => paper.id === paperId))
      .filter((paper): paper is (typeof papers)[number] => Boolean(paper) && !seen.has(paper.id) && seen.add(paper.id));
  }, [papers, recentlyOpenedPaperIds]);

  const visibleRecentlyOpened = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return recentlyOpened;
    return recentlyOpened.filter((paper) => {
      const haystack = [paper.title, paper.authors, paper.domain, paper.topic, String(paper.year ?? '')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, recentlyOpened]);

  const groupedByYear = useMemo(() => {
    const groups = new Map<string, typeof filteredItems>();
    filteredItems.forEach((paper) => {
      const yearKey = paper.year ? String(paper.year) : 'Undated';
      const group = groups.get(yearKey) || [];
      group.push(paper);
      groups.set(yearKey, group);
    });

    return [...groups.entries()].sort((a, b) => {
      if (a[0] === 'Undated') return 1;
      if (b[0] === 'Undated') return -1;
      return Number(b[0]) - Number(a[0]);
    });
  }, [filteredItems]);

  const openPaper = (paperId: number) => {
    setSelectedPaperId(paperId);
    setActiveReaderId(paperId);
  };

  return (
    <div className="h-full w-full flex flex-col bg-transparent overflow-hidden select-none">
      <div className="px-4 py-3 border-b border-border/50 bg-card/10">
        <div className="flex items-center gap-2 mb-2">
          <Clock3 size={14} className="text-primary" />
          <h2 className="text-xs font-semibold text-foreground/80 tracking-tight">Paper History</h2>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          All uploaded papers in the order they were added to the workspace.
        </p>
        <div className="mt-3 relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author, year..."
            className="w-full bg-background border border-border rounded-md py-2 pl-8 pr-3 text-[11px] mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-all"
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[9px] mono uppercase tracking-[0.2em] text-muted-foreground">
            {papers.length} papers in workspace
          </p>
          <button
            type="button"
            onClick={clearRecentlyOpenedPaperIds}
            disabled={recentlyOpenedPaperIds.length === 0}
            className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1 text-[9px] font-bold uppercase text-muted-foreground transition-all hover:text-foreground hover:border-foreground/20 disabled:opacity-40"
          >
            <Trash2 size={10} />
            Clear Recent
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {visibleRecentlyOpened.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-[9px] mono uppercase tracking-[0.2em] text-muted-foreground">
              <History size={10} />
              Recently Opened
            </div>
            <div className="space-y-2">
              {visibleRecentlyOpened.slice(0, 5).map((paper) => (
                <HistoryCard key={`recent-${paper.id}`} paper={paper} isActive={selectedPaperId === paper.id} onOpen={openPaper} onSelect={setSelectedPaperId} compact />
              ))}
            </div>
          </div>
        )}

        {groupedByYear.length > 0 ? (
          <div className="space-y-3 pt-1">
            {groupedByYear.map(([year, yearPapers]) => (
              <div key={year} className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-[9px] mono uppercase tracking-[0.2em] text-muted-foreground">
                  <Calendar size={10} />
                  {year}
                  <span className="text-muted-foreground/60">({yearPapers.length})</span>
                </div>
                <div className="space-y-2">
                  {yearPapers.map((paper) => (
                    <HistoryCard key={paper.id} paper={paper} isActive={selectedPaperId === paper.id} onOpen={openPaper} onSelect={setSelectedPaperId} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 px-4 text-center space-y-4 opacity-70">
            <Clock3 size={32} className="mx-auto text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">No papers match your search</p>
              <p className="text-[10px] text-muted-foreground">Try a different keyword or upload PDFs from the library.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const HistoryCard = ({
  paper,
  isActive,
  onOpen,
  onSelect,
  compact = false,
}: {
  paper: Paper;
  isActive: boolean;
  onOpen: (paperId: number) => void;
  onSelect: (paperId: number | null) => void;
  compact?: boolean;
}) => (
  <div className={`p-3 border rounded-lg transition-all group ${isActive ? 'bg-accent/40 border-primary/40' : 'bg-card/30 border-border hover:border-primary/25 hover:bg-card/50'} ${compact ? 'p-2.5' : ''}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 text-[9px] mono text-muted-foreground uppercase tracking-widest">
          {paper.is_external ? (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Imported</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Uploaded</span>
          )}
        </div>

        <h3 className="text-[11px] font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {paper.title}
        </h3>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] mono text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            <User size={10} />
            <span className="truncate max-w-[140px]">{paper.authors || 'Unknown authors'}</span>
          </div>
          {paper.year && (
            <div className="flex items-center gap-1.5">
              <Calendar size={10} />
              <span>{paper.year}</span>
            </div>
          )}
          {paper.created_at && (
            <div className="flex items-center gap-1.5">
              <RefreshCcw size={10} />
              <span>{formatPaperTimestamp(paper.created_at)}</span>
            </div>
          )}
          {paper.scholar_url && (
            <div className="flex items-center gap-1.5">
              <ExternalLink size={10} />
              <span>Available online</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={() => onOpen(paper.id)}
          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-foreground text-background text-[9px] font-bold uppercase hover:opacity-90 transition-all"
        >
          <CircleArrowRight size={10} />
          Open
        </button>
        <button
          onClick={() => onSelect(paper.id)}
          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-background border border-border text-[9px] font-bold uppercase text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
        >
          <FileText size={10} />
          Select
        </button>
      </div>
    </div>

    {paper.concepts && paper.concepts.length > 0 && (
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2 text-[9px] text-muted-foreground mono">
        <Sparkles size={10} />
        <span>{paper.concepts.length} concepts extracted</span>
      </div>
    )}
  </div>
);

const formatPaperTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default PaperHistory;