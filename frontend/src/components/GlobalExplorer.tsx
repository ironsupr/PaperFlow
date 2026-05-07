import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Loader2, 
  Globe, 
  User, 
  Calendar, 
  ExternalLink,
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../api/client';

const GlobalExplorer = () => {
  const { 
    explorerResults, 
    isExplorerLoading, 
    setExplorerState, 
    fetchPapers, 
    papers 
  } = useStore();
  
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    if (cooldownSeconds > 0) {
      setError(`Please wait ${cooldownSeconds} seconds before searching again.`);
      return;
    }
    
    setError(null);
    setExplorerState({ isExplorerLoading: true });
    
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    try {
      const results = await api.exploreSearch(query);
      setExplorerState({ explorerResults: results });
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Search failed. Please try again later.';
      setError(errorMsg);
      
      // Extract cooldown seconds from error message if present
      const cooldownMatch = errorMsg.match(/wait (\d+) seconds/);
      if (cooldownMatch) {
        setCooldownSeconds(parseInt(cooldownMatch[1]) + 1);
      }
    } finally {
      setExplorerState({ isExplorerLoading: false });
    }
  };

  const handleImport = async (paperData: any) => {
    try {
      await api.importPaper(paperData);
      await fetchPapers(); // Refresh library
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const isAlreadyInLibrary = (title: string) => {
    return papers.some(p => p.title.toLowerCase() === title.toLowerCase());
  };

  const isSearchDisabled = isExplorerLoading || cooldownSeconds > 0;

  return (
    <div className="h-full w-full flex flex-col bg-transparent overflow-hidden select-none">
      {/* Search Header */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={14} className="text-primary" />
          <h2 className="text-xs font-semibold text-foreground/80 tracking-tight">Global Explorer</h2>
        </div>
        <form onSubmit={handleSearch} className="relative space-y-2">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search global research..."
              className="w-full bg-accent/20 border border-border rounded py-2 pl-3 pr-10 text-[11px] mono focus:outline-none focus:border-primary/50 transition-all disabled:opacity-50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isSearchDisabled}
            />
            <button 
              type="submit"
              disabled={isSearchDisabled}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExplorerLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
              <AlertCircle size={12} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {cooldownSeconds > 0 && (
            <div className="text-[10px] text-muted-foreground text-center">
              Please wait {cooldownSeconds}s before next search
            </div>
          )}
        </form>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {explorerResults.map((res, i) => {
          const exists = isAlreadyInLibrary(res.title);
          return (
            <div key={i} className="p-3 bg-card/30 border border-border rounded-lg space-y-3 group hover:border-primary/30 transition-all">
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-bold text-foreground leading-snug line-clamp-2 uppercase tracking-tight group-hover:text-primary transition-colors">
                  {res.title}
                </h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] mono text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User size={10} />
                    <span className="truncate max-w-[120px]">{res.authors || 'Unknown'}</span>
                  </div>
                  {res.year && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={10} />
                      <span>{res.year}</span>
                    </div>
                  )}
                  {res.citation_count !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <FileText size={10} />
                      <span>{res.citation_count} cit.</span>
                    </div>
                  )}
                </div>
              </div>

              {res.abstract && (
                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 italic">
                  {res.abstract}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button 
                  onClick={() => handleImport(res)}
                  disabled={exists}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[9px] font-bold uppercase transition-all
                    ${exists 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-foreground text-background hover:opacity-90 shadow-sm'}`}
                >
                  {exists ? (
                    <><CheckCircle2 size={12} /> In Library</>
                  ) : (
                    <><Plus size={12} /> Import Paper</>
                  )}
                </button>
                {res.scholar_url && (
                  <a 
                    href={res.scholar_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-1.5 bg-accent/30 border border-border rounded text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {!isExplorerLoading && explorerResults.length === 0 && (
          <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
            <Globe size={32} className="text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Global Search</p>
              <p className="text-[9px] mono italic">Search millions of papers via Semantic Scholar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalExplorer;
