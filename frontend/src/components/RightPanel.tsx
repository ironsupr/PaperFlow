import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import {
  Sparkles, Loader2, GitBranch, User, Database,
  MessageSquare, Activity, Terminal, Binary, GitCompare,
  Mic2, Play, Pause, Volume2, Compass, TrendingUp, Lightbulb,
  ShieldAlert, Fingerprint, AlertTriangle, CheckCircle2, AlertCircle,
  HelpCircle, BarChart3, FileText, ShieldCheck,
  GraduationCap, Microscope, Send, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, API_BASE_URL } from '../api/client';

// ─── Inline markdown helpers ────────────────────────────────────────────────

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  );
}

const MarkdownText = ({ text, className = '' }: { text: string; className?: string }) => {
  if (!text) return null;
  return (
    <div className={`space-y-1.5 ${className}`}>
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="h-1" />;
        if (t.startsWith('### ')) return <p key={i} className="text-[11px] font-bold text-foreground mt-2">{t.slice(4)}</p>;
        if (t.startsWith('## '))  return <p key={i} className="text-[12px] font-bold text-foreground mt-3 pb-0.5 border-b border-border/30">{t.slice(3)}</p>;
        if (t.startsWith('# '))   return <p key={i} className="text-[13px] font-bold text-foreground mt-3">{t.slice(2)}</p>;
        if (t.match(/^[-•*] /)) return (
          <div key={i} className="flex gap-2 items-start pl-1">
            <span className="text-primary/70 shrink-0 mt-[3px] text-[9px]">▸</span>
            <span className="text-[11px] leading-relaxed text-foreground/85">{formatInline(t.slice(2))}</span>
          </div>
        );
        const nm = t.match(/^(\d+)\.\s(.+)$/);
        if (nm) return (
          <div key={i} className="flex gap-2 items-start pl-1">
            <span className="text-primary/60 text-[10px] font-bold mono shrink-0 mt-[3px] min-w-[16px]">{nm[1]}.</span>
            <span className="text-[11px] leading-relaxed text-foreground/85">{formatInline(nm[2])}</span>
          </div>
        );
        return <p key={i} className="text-[11px] leading-relaxed text-foreground/85">{formatInline(t)}</p>;
      })}
    </div>
  );
};

// ─── Shared sub-components ──────────────────────────────────────────────────

const SectionCard = ({ title, icon, children, className = '' }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string;
}) => (
  <div className={`space-y-3 ${className}`}>
    <div className="flex items-center gap-2">
      <span className="text-primary/50">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45">{title}</span>
    </div>
    {children}
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-border/30 bg-card/20 ${className}`}>{children}</div>
);

const ActionButton = ({ onClick, disabled, children, variant = 'default' }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'primary';
}) => {
  const styles = {
    default:   'bg-foreground text-background hover:opacity-90',
    secondary: 'bg-card/40 text-foreground border border-border/40 hover:bg-card',
    primary:   'bg-primary text-primary-foreground hover:opacity-90',
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all disabled:opacity-30 ${styles}`}
    >
      {children}
    </button>
  );
};

const ScoreBar = ({ label, score }: { label: string; score: number }) => {
  const color = score >= 7 ? 'bg-green-400' : score >= 5 ? 'bg-yellow-400' : 'bg-red-400';
  const textColor = score >= 7 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-foreground/70">{label}</span>
        <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>{score}/10</span>
      </div>
      <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
};

const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div className="py-16 flex flex-col items-center justify-center text-center gap-3 opacity-40">
    <div className="p-4 bg-card/20 rounded-full text-muted-foreground">{icon}</div>
    <p className="text-[11px] text-muted-foreground max-w-[160px] leading-relaxed">{message}</p>
  </div>
);

const Spinner = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-3 py-10">
    <Loader2 className="animate-spin text-primary" size={20} />
    <p className="text-[10px] text-muted-foreground">{message}</p>
  </div>
);

// ─── Main component ─────────────────────────────────────────────────────────

const RightPanel = () => {
  const {
    role, selectedPaperId, selectedMultiPaperIds, papers,
    setFocusedPaperId, focusedPaperId, crossPaperAnalysis,
    podcastStatus, podcastAudioUrl, podcastScript,
    discoveryGaps, discoveryNovelty, discoveryTrends, discoveryIdeas,
    discoveryMethods, discoveryFlaws, isDiscoveryLoading,
    reviewerScores, reviewerClaims, reviewerBias, reviewerReport, isReviewerLoading,
    activeIntelligenceTab, setDiscoveryState, setReviewerState, setActiveIntelligenceTab,
  } = useStore();

  const activeTab = activeIntelligenceTab;
  const setActiveTab = setActiveIntelligenceTab;

  const [summaryLevel, setSummaryLevel] = useState<'beginner' | 'intermediate' | 'technical'>('intermediate');
  const [paperSummary, setSummary]       = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [roleInsight, setRoleInsight]    = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [definitions, setDefinitions]    = useState<Record<string, string>>({});
  const [expandedDef, setExpandedDef]    = useState<string | null>(null);
  const [noveltyIdea, setNoveltyIdea]    = useState('');
  const [query, setQuery]                = useState('');
  const [responses, setResponses]        = useState<Array<{ query: string; answer: string; followUps: string[] }>>([]);
  const [loading, setLoading]            = useState(false);
  const audioRef   = useRef<HTMLAudioElement>(null);
  const chatEnd    = useRef<HTMLDivElement>(null);
  const didMount   = useRef(false);           // true after the first render
  const [isPlaying, setIsPlaying]        = useState(false);

  const selectedPaper = papers.find(p => p.id === selectedPaperId);
  const isFocused     = focusedPaperId === selectedPaperId;

  // Mark mount complete after first render
  useEffect(() => {
    didMount.current = true;
  }, []);

  // Sync tab with role — runs on role change only (not on re-open)
  useEffect(() => {
    if (role === 'student'   && !['intelligence', 'podcast'].includes(activeTab))               setActiveTab('intelligence');
    if (role === 'reviewer'  && !['intelligence', 'critique', 'citations'].includes(activeTab)) setActiveTab('critique');
  }, [role]);

  // Auto-switch tabs when NEW data arrives — skipped on initial mount so the
  // previously-active tab is restored when the sidebar is reopened.
  useEffect(() => {
    if (!didMount.current) return;
    if (discoveryGaps || discoveryTrends || discoveryIdeas || discoveryMethods || discoveryNovelty) setActiveTab('discovery');
    if (discoveryFlaws || reviewerScores || reviewerClaims || reviewerBias || reviewerReport)        setActiveTab('critique');
  }, [discoveryGaps, discoveryTrends, discoveryIdeas, discoveryMethods, discoveryNovelty,
      discoveryFlaws, reviewerScores, reviewerClaims, reviewerBias, reviewerReport]);

  useEffect(() => {
    if (!didMount.current) return;
    if (podcastStatus !== 'idle') setActiveTab('podcast');
  }, [podcastStatus]);

  // Fetch on paper change
  useEffect(() => {
    if (!selectedPaperId) return;
    setSummary(null); setRoleInsight(null); setDefinitions({});
    const level = role === 'student' ? 'beginner' : role === 'reviewer' ? 'technical' : 'intermediate';
    fetchSummary(level);
    fetchInsight();
    fetchDefinitions();
  }, [selectedPaperId, role]);

  const fetchSummary = async (level: 'beginner' | 'intermediate' | 'technical') => {
    if (!selectedPaperId) return;
    setSummaryLoading(true);
    try { const r = await api.summarizePaper(selectedPaperId, level); setSummary(r.summary); setSummaryLevel(level); }
    catch {} finally { setSummaryLoading(false); }
  };
  const fetchInsight = async () => {
    if (!selectedPaperId) return;
    setInsightLoading(true);
    try { const r = await api.getRoleInsight(selectedPaperId, role); setRoleInsight(r.insight); }
    catch {} finally { setInsightLoading(false); }
  };
  const fetchDefinitions = async () => {
    if (!selectedPaperId) return;
    try { const r = await api.getDefinitions(selectedPaperId); setDefinitions(r.definitions); } catch {}
  };

  const handleQuery = async (q?: string) => {
    const fq = q || query;
    if (!fq.trim()) return;
    setLoading(true);
    try {
      const r = await api.queryAI(fq, selectedPaperId || undefined, selectedMultiPaperIds.length > 0 ? selectedMultiPaperIds : undefined);
      const parts = r.answer.split('FOLLOW_UP:');
      setResponses(prev => [...prev, { query: fq, answer: parts[0].trim(), followUps: parts.slice(1).map((f: string) => f.trim()) }]);
      setQuery('');
      setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch {} finally { setLoading(false); }
  };

  const handleNoveltyCheck = async () => {
    if (!noveltyIdea.trim()) return;
    setDiscoveryState({ isDiscoveryLoading: true });
    try { const r = await api.noveltyCheck(noveltyIdea, selectedMultiPaperIds.length > 0 ? selectedMultiPaperIds : undefined); setDiscoveryState({ discoveryNovelty: r }); }
    catch {} finally { setDiscoveryState({ isDiscoveryLoading: false }); }
  };

  const handleReviewerAction = async (tool: string) => {
    if (selectedMultiPaperIds.length < 1) return;
    setReviewerState({ isReviewerLoading: true });
    try {
      let r: any;
      switch (tool) {
        case 'scores': r = await api.getReviewerScores(selectedMultiPaperIds); setReviewerState({ reviewerScores: r }); break;
        case 'claims': r = await api.verifyClaims(selectedMultiPaperIds); setReviewerState({ reviewerClaims: r.claims }); break;
        case 'bias':   r = await api.getBiasReport(selectedMultiPaperIds); setReviewerState({ reviewerBias: r.report }); break;
        case 'report': r = await api.generateStructuredReview(selectedMultiPaperIds); setReviewerState({ reviewerReport: r.review }); break;
      }
    } catch {} finally { setReviewerState({ isReviewerLoading: false }); }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  // Role badge
  const roleMeta = {
    student:    { label: 'Student',    icon: <GraduationCap size={10} />, cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    researcher: { label: 'Researcher', icon: <Microscope size={10} />,    cls: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
    reviewer:   { label: 'Reviewer',   icon: <ShieldCheck size={10} />,   cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  }[role];

  const tabs = [
    { id: 'intelligence', label: 'Stream',    icon: <Terminal size={13} />,   show: true },
    { id: 'podcast',      label: 'Podcast',   icon: <Mic2 size={13} />,       show: role === 'student' },
    { id: 'discovery',    label: 'Discovery', icon: <Compass size={13} />,    show: role === 'researcher' },
    { id: 'citations',    label: role === 'reviewer' ? 'Topology' : 'Graph', icon: <GitBranch size={13} />, show: role !== 'student' },
    { id: 'critique',     label: 'Critique',  icon: <ShieldAlert size={13} />, show: role === 'reviewer' },
  ].filter(t => t.show);

  return (
    <div className="h-full w-full flex flex-col bg-transparent overflow-hidden select-none">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="border-b border-border/40 bg-card/5 shrink-0">
        {/* Title row */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-primary" />
            <span className="text-[12px] font-bold text-foreground/80 tracking-wide">Intelligence</span>
          </div>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${roleMeta.cls}`}>
            {roleMeta.icon} {roleMeta.label}
          </span>
        </div>

        {/* Active paper strip */}
        {selectedPaper && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-background/50 border border-border/30">
            <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2">{selectedPaper.title}</p>
            {selectedPaper.authors && (
              <p className="mt-0.5 text-[10px] text-muted-foreground truncate flex items-center gap-1">
                <User size={9} className="shrink-0" />{selectedPaper.authors}
              </p>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-t border-border/20">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              title={tab.label}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative transition-colors
                ${activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground/60 hover:text-muted-foreground'}`}
            >
              {tab.icon}
              <span className="text-[9px] font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div layoutId="tab-line" className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">

          {/* ── Stream / Intelligence ── */}
          {activeTab === 'intelligence' && (
            <motion.div key="intelligence" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-4 space-y-6">
              {!selectedPaperId ? (
                <EmptyState icon={<Sparkles size={22} />} message="Select a paper from the library to start analysis" />
              ) : (
                <>
                  {/* Summary */}
                  <SectionCard title="Summary" icon={<Activity size={12} />}>
                    <div className="space-y-2">
                      <div className="flex rounded-lg overflow-hidden border border-border/30 bg-background/50 p-0.5 gap-0.5">
                        {(['beginner', 'intermediate', 'technical'] as const).map(l => {
                          const labels = { beginner: 'Simple', intermediate: 'Standard', technical: 'Technical' };
                          const rec = (role === 'student' && l === 'beginner') || (role === 'reviewer' && l === 'technical');
                          return (
                            <button key={l} onClick={() => fetchSummary(l)}
                              className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-all ${summaryLevel === l ? 'bg-accent text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                              {labels[l]}{rec ? ' ★' : ''}
                            </button>
                          );
                        })}
                      </div>
                      <Card className="p-3 min-h-[64px]">
                        {summaryLoading
                          ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 size={12} className="animate-spin" /><span className="text-[10px]">Synthesising…</span></div>
                          : paperSummary
                            ? <MarkdownText text={paperSummary} />
                            : <p className="text-[11px] text-muted-foreground/50 italic">Awaiting synthesis…</p>
                        }
                      </Card>
                    </div>
                  </SectionCard>

                  {/* Cross-paper analysis */}
                  {crossPaperAnalysis && role === 'researcher' && (
                    <SectionCard title="Cross-Paper Analysis" icon={<GitCompare size={12} />}>
                      <Card className="p-3 border-primary/15 bg-primary/5">
                        <MarkdownText text={crossPaperAnalysis} />
                      </Card>
                    </SectionCard>
                  )}

                  {/* Role insight */}
                  <SectionCard title={`${role.charAt(0).toUpperCase() + role.slice(1)} Perspective`} icon={<Binary size={12} />}>
                    <Card className="p-3 min-h-[48px]">
                      {insightLoading
                        ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 size={12} className="animate-spin" /><span className="text-[10px]">Analysing…</span></div>
                        : roleInsight
                          ? <MarkdownText text={roleInsight} />
                          : <p className="text-[11px] text-muted-foreground/50 italic">No perspective data yet.</p>
                      }
                    </Card>
                  </SectionCard>

                  {/* Glossary — student only */}
                  {role === 'student' && Object.keys(definitions).length > 0 && (
                    <SectionCard title="Key Terms" icon={<Terminal size={12} />}>
                      <div className="space-y-1.5">
                        {Object.entries(definitions).map(([term, def]) => (
                          <div key={term} className="rounded-lg border border-border/25 bg-card/10 overflow-hidden">
                            <button
                              onClick={() => setExpandedDef(expandedDef === term ? null : term)}
                              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-card/30 transition-colors"
                            >
                              <span className="text-[11px] font-semibold text-foreground">{term}</span>
                              {expandedDef === term ? <ChevronUp size={12} className="text-muted-foreground shrink-0" /> : <ChevronDown size={12} className="text-muted-foreground shrink-0" />}
                            </button>
                            <AnimatePresence>
                              {expandedDef === term && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border/20">
                                  <p className="px-3 py-2.5 text-[11px] text-muted-foreground leading-relaxed">{def}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {/* Chat history */}
                  {responses.length > 0 && (
                    <SectionCard title="Conversation" icon={<MessageSquare size={12} />}>
                      <div className="space-y-4">
                        {responses.map((res, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-end">
                              <span className="bg-primary text-primary-foreground text-[11px] px-3 py-2 rounded-2xl rounded-tr-sm max-w-[90%] leading-relaxed">{res.query}</span>
                            </div>
                            <div className="flex justify-start">
                              <div className="bg-card/30 border border-border/25 px-3 py-2.5 rounded-2xl rounded-tl-sm max-w-[95%]">
                                <MarkdownText text={res.answer} />
                              </div>
                            </div>
                            {res.followUps.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pl-1 pt-0.5">
                                {res.followUps.map((f, fi) => (
                                  <button key={fi} onClick={() => handleQuery(f)}
                                    className="text-[10px] px-2.5 py-1 bg-background border border-border/40 rounded-full text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                                    {f}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        <div ref={chatEnd} />
                      </div>
                    </SectionCard>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── Discovery ── */}
          {activeTab === 'discovery' && role === 'researcher' && (
            <motion.div key="discovery" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="p-4 space-y-6">
              {isDiscoveryLoading && <Spinner message="Scanning corpus…" />}

              <SectionCard title="Novelty Check" icon={<Zap size={12} />}>
                <div className="space-y-2.5">
                  <textarea
                    placeholder="Describe your research idea to check against loaded papers…"
                    className="w-full h-20 bg-background/60 border border-border/30 rounded-lg p-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 transition-all resize-none"
                    value={noveltyIdea} onChange={e => setNoveltyIdea(e.target.value)}
                  />
                  <ActionButton onClick={handleNoveltyCheck} disabled={!noveltyIdea.trim() || isDiscoveryLoading}>Assess Novelty</ActionButton>
                  {discoveryNovelty && (
                    <Card className="overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between border-b border-border/25">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Novelty Score</span>
                        <span className={`text-2xl font-black tabular-nums ${discoveryNovelty.score > 70 ? 'text-green-400' : discoveryNovelty.score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {discoveryNovelty.score}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-border/20">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${discoveryNovelty.score}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full ${discoveryNovelty.score > 70 ? 'bg-green-400' : discoveryNovelty.score > 40 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                      </div>
                      <p className="px-4 py-3 text-[11px] text-foreground/80 leading-relaxed">{discoveryNovelty.critique}</p>
                    </Card>
                  )}
                </div>
              </SectionCard>

              {discoveryGaps && (
                <SectionCard title="Research Gaps" icon={<Compass size={12} />}>
                  <Card className="p-3"><MarkdownText text={discoveryGaps} /></Card>
                </SectionCard>
              )}

              {discoveryTrends && (
                <SectionCard title="Trend Analysis" icon={<TrendingUp size={12} />}>
                  <div className="space-y-2">
                    {discoveryTrends.trending?.map((t: any, i: number) => (
                      <div key={i} className="flex gap-3 rounded-xl border border-green-400/20 bg-green-400/5 p-3">
                        <TrendingUp size={14} className="text-green-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-semibold text-green-400">{t.topic}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{t.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {discoveryIdeas && (
                <SectionCard title="Research Ideas" icon={<Lightbulb size={12} />}>
                  <div className="space-y-2">
                    {discoveryIdeas.map((idea: any, i: number) => (
                      <Card key={i} className="p-3 space-y-1.5 hover:border-primary/30 transition-colors cursor-default">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-black text-primary/50 mono shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                          <p className="text-[11px] font-semibold text-foreground leading-snug">{idea.title}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed pl-5">{idea.rationale}</p>
                      </Card>
                    ))}
                  </div>
                </SectionCard>
              )}
            </motion.div>
          )}

          {/* ── Critique ── */}
          {activeTab === 'critique' && role === 'reviewer' && (
            <motion.div key="critique" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="p-4 space-y-6">
              {(isDiscoveryLoading || isReviewerLoading) && <Spinner message="Auditing paper…" />}

              {/* Metrics */}
              <SectionCard title="Paper Metrics" icon={<BarChart3 size={12} />}>
                <div className="space-y-2.5">
                  <ActionButton onClick={() => handleReviewerAction('scores')}>Evaluate Metrics</ActionButton>
                  {reviewerScores && (
                    <Card className="p-4 space-y-3">
                      <ScoreBar label="Clarity"  score={reviewerScores.clarity} />
                      <ScoreBar label="Novelty"  score={reviewerScores.novelty} />
                      <ScoreBar label="Validity" score={reviewerScores.validity} />
                      <ScoreBar label="Impact"   score={reviewerScores.impact} />
                      <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Overall</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-foreground tabular-nums">{reviewerScores.overall}</span>
                          <span className="text-[11px] text-muted-foreground">/10</span>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </SectionCard>

              {/* Claims */}
              <SectionCard title="Claim Verification" icon={<ShieldCheck size={12} />}>
                <div className="space-y-2.5">
                  <ActionButton variant="secondary" onClick={() => handleReviewerAction('claims')}>Verify Claims</ActionButton>
                  {reviewerClaims && (
                    <div className="space-y-2">
                      {reviewerClaims.map((c, i) => {
                        const s = {
                          supported:   { icon: <CheckCircle2 size={12} />, color: 'text-green-400', bg: 'border-green-400/20 bg-green-400/5', badge: 'bg-green-400/15 text-green-400' },
                          unsupported: { icon: <AlertCircle size={12} />,  color: 'text-red-400',   bg: 'border-red-400/20 bg-red-400/5',   badge: 'bg-red-400/15 text-red-400' },
                          partial:     { icon: <HelpCircle size={12} />,   color: 'text-yellow-400',bg: 'border-yellow-400/20 bg-yellow-400/5', badge: 'bg-yellow-400/15 text-yellow-400' },
                        }[c.status] ?? { icon: <HelpCircle size={12} />, color: 'text-muted-foreground', bg: 'border-border/30 bg-card/20', badge: 'bg-card/20 text-muted-foreground' };
                        return (
                          <div key={i} className={`rounded-xl border p-3 space-y-2 ${s.bg}`}>
                            <div className="flex items-start gap-2">
                              <span className={`${s.color} shrink-0 mt-0.5`}>{s.icon}</span>
                              <p className="text-[11px] font-medium text-foreground leading-snug">{c.claim}</p>
                            </div>
                            <div className="flex items-center gap-2 pl-5">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${s.badge}`}>{c.status}</span>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">{c.context}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Flaws */}
              {discoveryFlaws && (
                <SectionCard title="Flaw Detection" icon={<AlertTriangle size={12} />}>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                    <MarkdownText text={discoveryFlaws} className="[&_p]:text-red-200/75 [&_span]:text-red-200/75" />
                  </div>
                </SectionCard>
              )}

              {/* Bias */}
              {reviewerBias && (
                <SectionCard title="Bias & Quality" icon={<Fingerprint size={12} />}>
                  <Card className="p-3"><MarkdownText text={reviewerBias} /></Card>
                </SectionCard>
              )}

              {/* Formal review */}
              <SectionCard title="Formal Review" icon={<FileText size={12} />}>
                <div className="space-y-2.5">
                  <ActionButton variant="primary" onClick={() => handleReviewerAction('report')}>Generate Peer Review</ActionButton>
                  {reviewerReport && (
                    <div className="rounded-xl border border-border/30 bg-background overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-card/20">
                        <span className="text-[10px] mono text-muted-foreground">peer_review.md</span>
                        <button onClick={() => navigator.clipboard.writeText(reviewerReport)}
                          className="text-[10px] font-semibold text-primary hover:text-primary/70 transition-colors">
                          Copy
                        </button>
                      </div>
                      <div className="p-3 max-h-[360px] overflow-y-auto custom-scrollbar">
                        <MarkdownText text={reviewerReport} />
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* ── Podcast ── */}
          {activeTab === 'podcast' && role === 'student' && (
            <motion.div key="podcast" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="p-4 space-y-6">
              <SectionCard title="Research Radio" icon={<Mic2 size={12} />}>
                <Card className="p-5 flex flex-col items-center text-center gap-5">
                  {podcastStatus === 'idle' && (
                    <>
                      <div className="w-16 h-16 bg-card/40 border border-border rounded-full flex items-center justify-center text-muted-foreground/50"><Volume2 size={26} /></div>
                      <div className="space-y-1">
                        <p className="text-[12px] font-semibold text-foreground/75">No episode yet</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">Open a paper then click <span className="text-foreground font-medium">Generate Podcast</span></p>
                      </div>
                    </>
                  )}
                  {podcastStatus === 'processing' && (
                    <>
                      <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center text-background shadow-xl animate-pulse"><Volume2 size={28} /></div>
                      <div className="space-y-2">
                        <Loader2 className="animate-spin text-muted-foreground mx-auto" size={20} />
                        <p className="text-[11px] text-muted-foreground">Generating script and synthesising audio…</p>
                      </div>
                    </>
                  )}
                  {podcastStatus === 'error' && (
                    <>
                      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400"><Volume2 size={26} /></div>
                      <div className="space-y-1">
                        <p className="text-[12px] font-semibold text-red-400">Generation failed</p>
                        <p className="text-[10px] text-muted-foreground">Check backend logs and retry</p>
                      </div>
                    </>
                  )}
                  {podcastStatus === 'ready' && podcastAudioUrl && (
                    <>
                      <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center text-background shadow-xl"><Volume2 size={28} /></div>
                      <audio ref={audioRef} src={`${API_BASE_URL}${podcastAudioUrl}`} onEnded={() => setIsPlaying(false)} />
                      <button onClick={togglePlayback}
                        className="w-14 h-14 bg-foreground text-background rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg">
                        {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                      </button>
                      <p className="text-[10px] text-muted-foreground">Research Radio · Alex &amp; Jamie</p>
                    </>
                  )}
                </Card>
              </SectionCard>

              {podcastScript && podcastScript.length > 0 && (podcastStatus === 'ready' || podcastStatus === 'processing') && (
                <SectionCard title="Transcript" icon={<Terminal size={12} />}>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                    {podcastScript.map((line, i) => (
                      <div key={i} className={`rounded-xl border border-border/20 p-3 ${line.speaker === 'Alex' ? 'bg-card/30' : 'bg-accent/5'}`}>
                        <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${line.speaker === 'Alex' ? 'text-primary/60' : 'text-muted-foreground'}`}>{line.speaker}</span>
                        <p className="text-[11px] leading-relaxed text-foreground/90">{line.text}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </motion.div>
          )}

          {/* ── Citations / Topology ── */}
          {activeTab === 'citations' && (
            <motion.div key="citations" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="p-4 space-y-6">
              {selectedPaper ? (
                <>
                  <SectionCard title="Graph Controls" icon={<GitBranch size={12} />}>
                    <button
                      onClick={() => setFocusedPaperId(isFocused ? null : selectedPaperId)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-medium transition-all
                        ${isFocused ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border/40 hover:text-foreground hover:border-border'}`}
                    >
                      <Activity size={12} />
                      {isFocused ? 'Clear node focus' : 'Focus this node'}
                    </button>
                  </SectionCard>

                  <SectionCard title={`References (${selectedPaper.reference_ids?.length ?? 0})`} icon={<Database size={12} />}>
                    {selectedPaper.reference_ids?.length ? (
                      <div className="space-y-1.5">
                        {selectedPaper.reference_ids.map((refId: number) => {
                          const ref = papers.find(p => p.id === refId);
                          return (
                            <div key={refId} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border/20 bg-card/10 hover:border-border/50 transition-colors">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0 mt-1.5" />
                              <p className="text-[11px] text-foreground/80 leading-snug">{ref?.title ?? `Paper #${refId}`}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/50 italic">No references recorded.</p>
                    )}
                  </SectionCard>
                </>
              ) : (
                <EmptyState icon={<GitBranch size={22} />} message="Select a paper to inspect its citation topology" />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Query input ───────────────────────────────────────── */}
      <div className="shrink-0 p-3 border-t border-border/30 bg-card/5">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder={selectedPaper ? 'Ask about this paper…' : 'Select a paper first…'}
            className="flex-1 bg-background/70 border border-border/30 rounded-lg py-2 px-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 transition-all"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuery()}
            disabled={loading || !selectedPaperId}
          />
          <button
            onClick={() => handleQuery()}
            disabled={loading || !selectedPaperId || !query.trim()}
            className="w-9 h-9 shrink-0 flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-25 transition-all"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>

    </div>
  );
};

export default RightPanel;
