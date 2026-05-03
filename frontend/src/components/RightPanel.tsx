import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { 
  Sparkles, 
  Zap, 
  Loader2, 
  GitBranch, 
  Plus, 
  User, 
  Database,
  MessageSquare,
  Activity,
  Terminal,
  Binary,
  GitCompare,
  Mic2,
  Play,
  Pause,
  RotateCcw,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';

const RightPanel = () => {
  const { 
    role, 
    selectedPaperId, 
    papers, 
    fetchPapers, 
    setFocusedPaperId, 
    focusedPaperId,
    crossPaperAnalysis,
    podcastStatus,
    podcastAudioUrl,
    podcastScript
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<'intelligence' | 'citations' | 'comparative' | 'podcast'>('intelligence');
  
  // Intelligence State
  const [summaryLevel, setSummaryLevel] = useState<'beginner' | 'intermediate' | 'technical'>('intermediate');
  const [paperSummary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [roleInsight, setRoleInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  
  // UI State
  const [query, setQuery] = useState('');
  const [responses, setResponses] = useState<Array<{ query: string; answer: string; followUps: string[] }>>([]);
  const [loading, setLoading] = useState(false);
  const [showAddRef, setShowAddRef] = useState(false);

  // Audio Ref
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedPaper = papers.find(p => p.id === selectedPaperId);
  const otherPapers = papers.filter(p => p.id !== selectedPaperId && !selectedPaper?.reference_ids?.includes(p.id));
  const isFocused = focusedPaperId === selectedPaperId;

  const handleFetchSummary = async (level: 'beginner' | 'intermediate' | 'technical') => {
    if (!selectedPaperId) return;
    setSummaryLoading(true);
    try {
      const res = await api.summarizePaper(selectedPaperId, level);
      setSummary(res.summary);
      setSummaryLevel(level);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleFetchRoleInsight = async () => {
    if (!selectedPaperId) return;
    setInsightLoading(true);
    try {
      const res = await api.getRoleInsight(selectedPaperId, role);
      setRoleInsight(res.insight);
    } catch (error) {
      console.error('Failed to fetch insight:', error);
    } finally {
      setInsightLoading(false);
    }
  };

  const handleFetchDefinitions = async () => {
    if (!selectedPaperId) return;
    try {
      const res = await api.getDefinitions(selectedPaperId);
      setDefinitions(res.definitions);
    } catch (error) {
      console.error('Failed to fetch definitions:', error);
    }
  };

  useEffect(() => {
    if (crossPaperAnalysis) setActiveTab('comparative');
  }, [crossPaperAnalysis]);

  useEffect(() => {
    if (podcastStatus !== 'idle') setActiveTab('podcast');
  }, [podcastStatus]);

  useEffect(() => {
    if (!selectedPaperId) return;
    setSummary(null);
    setRoleInsight(null);
    setDefinitions({});
    handleFetchSummary(summaryLevel);
    handleFetchRoleInsight();
    handleFetchDefinitions();
  }, [selectedPaperId, role]);

  const handleQuery = async (q?: string) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;
    setLoading(true);
    try {
      const res = await api.queryAI(finalQuery, selectedPaperId || undefined);
      const parts = res.answer.split('FOLLOW_UP:');
      const answer = parts[0].trim();
      const followUps = parts.slice(1).map((f: string) => f.trim());
      setResponses(prev => [...prev, { query: finalQuery, answer, followUps }]);
      setQuery('');
    } catch (error) {
      console.error('AI query failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReference = async (refId: number) => {
    if (!selectedPaperId) return;
    try {
      await api.addReference(selectedPaperId, refId);
      await fetchPapers();
      setShowAddRef(false);
    } catch (error) {
      console.error('Failed to add reference:', error);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-transparent overflow-hidden select-none">
      {/* Panel Header */}
      <div className="px-4 py-4 border-b border-border/50 bg-card/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-foreground" />
            <h2 className="text-xs font-semibold text-foreground/80">Intelligence</h2>
          </div>
          <div className="flex items-center gap-1 p-0.5 bg-background border border-border rounded overflow-x-auto no-scrollbar">
            <TabButton active={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')} icon={<Terminal size={12} />} label="Stream" />
            <TabButton active={activeTab === 'citations'} onClick={() => setActiveTab('citations')} icon={<GitBranch size={12} />} label="Graph" />
            {(crossPaperAnalysis || activeTab === 'comparative') && (
              <TabButton active={activeTab === 'comparative'} onClick={() => setActiveTab('comparative')} icon={<GitCompare size={12} />} label="Cross" />
            )}
            {(podcastStatus !== 'idle' || activeTab === 'podcast') && (
              <TabButton active={activeTab === 'podcast'} onClick={() => setActiveTab('podcast')} icon={<Mic2 size={12} />} label="Audio" />
            )}
          </div>
        </div>

        {selectedPaper && activeTab === 'intelligence' && (
          <div className="space-y-1.5">
            <h3 className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2">
              {selectedPaper.title}
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mono">
              <User size={10} />
              <span className="truncate">{selectedPaper.authors || 'Unknown'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'intelligence' && (
            <motion.div key="intelligence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-8">
              {!selectedPaperId ? <EmptyState icon={<Terminal size={24} />} message="Load a document to initialize analysis" /> : (
                <>
                  <Section title="Neural Summary" icon={<Activity size={12} />}>
                    <div className="space-y-4">
                      <div className="flex gap-1 p-1 bg-background border border-border rounded w-fit">
                        {(['beginner', 'intermediate', 'technical'] as const).map(l => (
                          <button key={l} onClick={() => handleFetchSummary(l)} className={`px-2 py-0.5 text-[10px] mono rounded transition-all ${summaryLevel === l ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{l}</button>
                        ))}
                      </div>
                      <div className="relative min-h-[40px] text-[11px] leading-relaxed text-muted-foreground border-l border-border pl-4 py-1 font-normal">
                        {summaryLoading && <div className="absolute inset-0 flex items-center justify-center bg-background/50"><Loader2 size={14} className="animate-spin" /></div>}
                        {paperSummary || 'Waiting for neural synthesis...'}
                      </div>
                    </div>
                  </Section>
                  <Section title={`${role.charAt(0).toUpperCase() + role.slice(1)} Context`} icon={<Binary size={12} />}>
                    <div className="space-y-5">
                      <div className="text-[11px] leading-relaxed text-foreground/90 bg-card/20 p-4 rounded border border-border/50">
                        {insightLoading ? <div className="flex items-center gap-2 text-muted-foreground mono text-[10px]"><Loader2 size={12} className="animate-spin" /><span>PROCESSING_STREAM...</span></div> : roleInsight || "Perspective data not available."}
                      </div>
                    </div>
                  </Section>
                  <Section title="Definitions" icon={<Terminal size={12} />}>
                    <div className="grid gap-2">
                      {Object.entries(definitions).map(([term, def]) => (
                        <div key={term} className="p-3 bg-card/5 border border-border/50 rounded hover:border-border transition-colors group">
                          <h5 className="text-[10px] mono font-semibold text-foreground mb-1.5">{term}</h5>
                          <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2 group-hover:line-clamp-none">{def}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                  {responses.length > 0 && (
                    <Section title="Stream History" icon={<MessageSquare size={12} />}>
                      <div className="space-y-6">
                        {responses.map((res, i) => (
                          <div key={i} className="space-y-4">
                            <div className="flex justify-end"><p className="text-[10px] bg-accent/20 px-3 py-2 rounded border border-border/30 text-foreground/80 max-w-[95%] mono">{`> ${res.query}`}</p></div>
                            <div className="flex justify-start"><p className="text-[11px] px-3 text-muted-foreground leading-relaxed border-l border-border pl-4">{res.answer}</p></div>
                            {res.followUps.length > 0 && (
                              <div className="flex flex-wrap gap-2 pl-4">
                                {res.followUps.map((f, fi) => (
                                  <button key={fi} onClick={() => handleQuery(f)} className="text-[9px] mono px-2 py-1 bg-background border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all">{f}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'comparative' && (
            <motion.div key="comparative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-6">
              <Section title="Cross-Paper Analysis" icon={<GitCompare size={14} />}>
                <div className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap bg-card/20 p-5 rounded border border-border/50">
                  {crossPaperAnalysis || "Select multiple papers and click 'Compare' to see patterns across your library."}
                </div>
              </Section>
            </motion.div>
          )}

          {activeTab === 'podcast' && (
            <motion.div key="podcast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-8">
              <Section title="Podcast Learning Mode" icon={<Mic2 size={14} />}>
                <div className="bg-accent/10 border border-border rounded-xl p-6 flex flex-col items-center text-center space-y-6">
                  <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center text-background shadow-2xl">
                    <Volume2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Conversational Research</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mono">Status: {podcastStatus}</p>
                  </div>
                  
                  {podcastAudioUrl && (
                    <>
                      <audio ref={audioRef} src={`http://localhost:8000${podcastAudioUrl}`} onEnded={() => setIsPlaying(false)} />
                      <div className="flex items-center gap-4">
                        <button onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 10 }} className="p-2 text-muted-foreground hover:text-foreground"><RotateCcw size={18} /></button>
                        <button onClick={togglePlayback} className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center hover:scale-105 transition-all">
                          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                        </button>
                        <button onClick={() => { if(audioRef.current) audioRef.current.currentTime += 10 }} className="p-2 text-muted-foreground hover:text-foreground rotate-180"><RotateCcw size={18} /></button>
                      </div>
                    </>
                  )}
                  {podcastStatus === 'processing' && <Loader2 className="animate-spin text-muted-foreground" size={24} />}
                </div>
              </Section>

              {podcastScript && (
                <Section title="Live Script" icon={<Terminal size={12} />}>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {podcastScript.map((line, i) => (
                      <div key={i} className={`p-3 rounded border border-border/30 ${line.speaker === 'Alex' ? 'bg-card/30' : 'bg-accent/5'}`}>
                        <span className="text-[9px] mono font-bold text-muted-foreground uppercase block mb-1">{line.speaker}</span>
                        <p className="text-[11px] leading-relaxed text-foreground/90">{line.text}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </motion.div>
          )}

          {activeTab === 'citations' && (
            <motion.div key="citations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-8">
              {selectedPaper ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-semibold text-muted-foreground mono">GRAPH_TOPOLOGY</h4>
                    <div className="flex gap-1.5">
                      <button onClick={() => setFocusedPaperId(isFocused ? null : selectedPaperId)} className={`p-1.5 rounded transition-all border ${isFocused ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:text-foreground'}`} title={isFocused ? "Clear Focus" : "Focus on Graph"}><Activity size={12} /></button>
                      <button onClick={() => setShowAddRef(!showAddRef)} className={`p-1.5 rounded transition-all border ${showAddRef ? 'bg-accent text-foreground border-border' : 'bg-background text-muted-foreground border-border hover:text-foreground'}`} title="Add Reference"><Plus size={12} /></button>
                    </div>
                  </div>
                  {showAddRef && (
                    <div className="p-3 bg-card/20 border border-border/50 rounded space-y-3">
                      <p className="text-[9px] mono text-muted-foreground">CONNECT_DOCUMENT</p>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                        {otherPapers.map(p => (
                          <button key={p.id} onClick={() => handleAddReference(p.id)} className="w-full text-left p-2 hover:bg-accent rounded text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate mono">{`./${p.title}`}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2"><Database size={12} className="text-muted-foreground" /><span className="text-[10px] font-semibold text-muted-foreground mono">{`REFERENCES [${selectedPaper.reference_ids?.length || 0}]`}</span></div>
                    <div className="space-y-1.5">
                      {selectedPaper.reference_ids?.map((refId: number) => {
                        const refPaper = papers.find(p => p.id === refId);
                        return (
                          <div key={refId} className="group flex items-center gap-3 p-2.5 bg-card/5 border border-border/30 rounded hover:border-border/60 transition-colors">
                            <div className="w-1 h-1 bg-foreground/40 rounded-full shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-foreground/90 truncate">{refPaper?.title || `Paper #${refId}`}</p>
                              <p className="text-[9px] text-muted-foreground truncate mono">{refPaper?.authors || 'UNKNOWN'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : <EmptyState icon={<GitBranch size={24} />} message="topology data unavailable" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 bg-card/5">
        <div className="relative group">
          <input
            type="text"
            placeholder={selectedPaper ? `Query research stream...` : `Select source...`}
            className="w-full bg-background border border-border rounded py-2 pl-3 pr-10 text-[11px] mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/30 transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            disabled={loading || !selectedPaperId}
          />
          <button 
            onClick={() => handleQuery()}
            disabled={loading || !selectedPaperId}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] mono transition-all whitespace-nowrap ${
      active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    {icon}
    {label}
  </button>
);

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-[10px] mono text-muted-foreground/60 uppercase tracking-wider">
      {icon}
      {title}
    </div>
    {children}
  </div>
);

const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
    <div className="p-4 bg-card/20 rounded-full text-muted-foreground">
      {icon}
    </div>
    <p className="text-[10px] mono text-muted-foreground max-w-[160px]">
      {message}
    </p>
  </div>
);

export default RightPanel;
