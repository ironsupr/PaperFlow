import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { 
  Sparkles, 
  Zap, 
  Loader2, 
  GitBranch, 
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
  Volume2,
  Compass,
  TrendingUp,
  Lightbulb,
  ShieldAlert,
  Fingerprint,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, API_BASE_URL } from '../api/client';

const RightPanel = () => {
  const { 
    role, 
    selectedPaperId, 
    selectedMultiPaperIds,
    papers, 
    setFocusedPaperId, 
    focusedPaperId,
    crossPaperAnalysis,
    podcastStatus,
    podcastAudioUrl,
    podcastScript,
    discoveryGaps,
    discoveryNovelty,
    discoveryTrends,
    discoveryIdeas,
    discoveryMethods,
    discoveryFlaws,
    isDiscoveryLoading,
    reviewerScores,
    reviewerClaims,
    reviewerBias,
    reviewerReport,
    isReviewerLoading,
    activeIntelligenceTab,
    setDiscoveryState,
    setReviewerState,
    setActiveIntelligenceTab
  } = useStore();
  
  const activeTab = activeIntelligenceTab;
  const setActiveTab = setActiveIntelligenceTab;
  
  // Intelligence State
  const [summaryLevel, setSummaryLevel] = useState<'beginner' | 'intermediate' | 'technical'>('intermediate');
  const [paperSummary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [roleInsight, setRoleInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  
  // Novelty State
  const [noveltyIdea, setNoveltyIdea] = useState('');
  
  // UI State
  const [query, setQuery] = useState('');
  const [responses, setResponses] = useState<Array<{ query: string; answer: string; followUps: string[] }>>([]);
  const [loading, setLoading] = useState(false);

  // Audio Ref
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedPaper = papers.find(p => p.id === selectedPaperId);
  const isFocused = focusedPaperId === selectedPaperId;

  // Sync tab with role
  useEffect(() => {
    if (role === 'student') {
      if (!['intelligence', 'podcast'].includes(activeTab)) setActiveTab('intelligence');
    } else if (role === 'reviewer') {
      if (!['intelligence', 'critique', 'citations'].includes(activeTab)) setActiveTab('critique');
    }
  }, [role, activeTab]);

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
    if (discoveryGaps || discoveryTrends || discoveryIdeas || discoveryMethods || discoveryNovelty) {
      setActiveTab('discovery');
    }
    if (discoveryFlaws || reviewerScores || reviewerClaims || reviewerBias || reviewerReport) {
      setActiveTab('critique');
    }
  }, [discoveryGaps, discoveryTrends, discoveryIdeas, discoveryMethods, discoveryNovelty, discoveryFlaws, reviewerScores, reviewerClaims, reviewerBias, reviewerReport]);

  useEffect(() => {
    if (podcastStatus !== 'idle') setActiveTab('podcast');
  }, [podcastStatus]);

  useEffect(() => {
    if (!selectedPaperId) return;
    setSummary(null);
    setRoleInsight(null);
    setDefinitions({});
    
    const level = role === 'student' ? 'beginner' : role === 'reviewer' ? 'technical' : 'intermediate';
    handleFetchSummary(level);
    handleFetchRoleInsight();
    handleFetchDefinitions();
  }, [selectedPaperId, role]);

  const handleQuery = async (q?: string) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;
    setLoading(true);
    try {
      const res = await api.queryAI(finalQuery, selectedPaperId || undefined, selectedMultiPaperIds.length > 0 ? selectedMultiPaperIds : undefined);
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

  const handleNoveltyCheck = async () => {
    if (!noveltyIdea.trim()) return;
    setDiscoveryState({ isDiscoveryLoading: true });
    try {
      const res = await api.noveltyCheck(noveltyIdea, selectedMultiPaperIds.length > 0 ? selectedMultiPaperIds : undefined);
      setDiscoveryState({ discoveryNovelty: res });
    } catch (error) {
      console.error('Novelty check failed:', error);
    } finally {
      setDiscoveryState({ isDiscoveryLoading: false });
    }
  };

  // Reviewer Tool Handlers
  const handleReviewerAction = async (tool: string) => {
    if (selectedMultiPaperIds.length < 1) return alert("Select at least 1 paper.");
    setReviewerState({ isReviewerLoading: true });
    try {
      let res;
      switch(tool) {
        case 'scores':
          res = await api.getReviewerScores(selectedMultiPaperIds);
          setReviewerState({ reviewerScores: res });
          break;
        case 'claims':
          res = await api.verifyClaims(selectedMultiPaperIds);
          setReviewerState({ reviewerClaims: res.claims });
          break;
        case 'bias':
          res = await api.getBiasReport(selectedMultiPaperIds);
          setReviewerState({ reviewerBias: res.report });
          break;
        case 'report':
          res = await api.generateStructuredReview(selectedMultiPaperIds);
          setReviewerState({ reviewerReport: res.review });
          break;
      }
    } catch (error) {
      console.error(`Reviewer tool ${tool} failed:`, error);
    } finally {
      setReviewerState({ isReviewerLoading: false });
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
            
            {role === 'student' && (
              <TabButton active={activeTab === 'podcast'} onClick={() => setActiveTab('podcast')} icon={<Mic2 size={12} />} label="Audio" />
            )}
            
            {role === 'researcher' && (
              <>
                <TabButton active={activeTab === 'discovery'} onClick={() => setActiveTab('discovery')} icon={<Compass size={12} />} label="Discovery" />
                <TabButton active={activeTab === 'citations'} onClick={() => setActiveTab('citations')} icon={<GitBranch size={12} />} label="Graph" />
              </>
            )}
            
            {role === 'reviewer' && (
              <>
                <TabButton active={activeTab === 'critique'} onClick={() => setActiveTab('critique')} icon={<ShieldAlert size={12} />} label="Critique" />
                <TabButton active={activeTab === 'citations'} onClick={() => setActiveTab('citations')} icon={<GitBranch size={12} />} label="Topology" />
              </>
            )}
          </div>
        </div>

        {selectedPaper && activeTab === 'intelligence' && (
          <div className="space-y-1.5">
            <h3 className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2">{selectedPaper.title}</h3>
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
                        {(['beginner', 'intermediate', 'technical'] as const).map(l => {
                          const isRecommended = (role === 'student' && l === 'beginner') || (role === 'reviewer' && l === 'technical');
                          return (
                            <button 
                              key={l} 
                              onClick={() => handleFetchSummary(l)} 
                              className={`px-2 py-0.5 text-[10px] mono rounded transition-all flex items-center gap-1 ${summaryLevel === l ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                              {l} {isRecommended && <div className="w-1 h-1 rounded-full bg-primary" />}
                            </button>
                          );
                        })}
                      </div>
                      <div className="relative min-h-[40px] text-[11px] leading-relaxed text-muted-foreground border-l border-border pl-4 py-1 font-normal">
                        {summaryLoading && <div className="absolute inset-0 flex items-center justify-center bg-background/50"><Loader2 size={14} className="animate-spin" /></div>}
                        {paperSummary || 'Waiting for neural synthesis...'}
                      </div>
                    </div>
                  </Section>
                  
                  {crossPaperAnalysis && role === 'researcher' && (
                    <Section title="Cross-Paper Analysis" icon={<GitCompare size={12} />}>
                      <div className="text-[11px] leading-relaxed text-foreground/80 bg-accent/10 p-4 rounded border border-border/30 whitespace-pre-wrap">{crossPaperAnalysis}</div>
                    </Section>
                  )}

                  <Section title={`${role.charAt(0).toUpperCase() + role.slice(1)} Context`} icon={<Binary size={12} />}>
                    <div className="text-[11px] leading-relaxed text-foreground/90 bg-card/20 p-4 rounded border border-border/50">
                      {insightLoading ? <div className="flex items-center gap-2 text-muted-foreground mono text-[10px]"><Loader2 size={12} className="animate-spin" /><span>PROCESSING_STREAM...</span></div> : roleInsight || "Perspective data not available."}
                    </div>
                  </Section>

                  {role === 'student' && (
                    <Section title="Glossary" icon={<Terminal size={12} />}>
                      <div className="grid gap-2">
                        {Object.entries(definitions).map(([term, def]) => (
                          <div key={term} className="p-3 bg-card/5 border border-border/50 rounded hover:border-border transition-colors group">
                            <h5 className="text-[10px] mono font-semibold text-foreground mb-1.5">{term}</h5>
                            <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2 group-hover:line-clamp-none">{def}</p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

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

          {activeTab === 'discovery' && role === 'researcher' && (
            <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-8">
              {isDiscoveryLoading && <div className="flex flex-col items-center gap-3 py-12"><Loader2 className="animate-spin text-primary" size={24} /><p className="text-[10px] mono text-muted-foreground">SCANNING_CORPUS...</p></div>}
              <Section title="Novelty Checker" icon={<Zap size={12} />}>
                <div className="space-y-4">
                  <textarea placeholder="Paste an idea to check against corpus..." className="w-full h-24 bg-background border border-border rounded p-3 text-[11px] mono focus:outline-none focus:border-primary/50 transition-all" value={noveltyIdea} onChange={e => setNoveltyIdea(e.target.value)} />
                  <button onClick={handleNoveltyCheck} disabled={!noveltyIdea.trim() || isDiscoveryLoading} className="w-full py-2 bg-foreground text-background text-[10px] font-bold uppercase rounded hover:opacity-90 disabled:opacity-30 transition-all">Assess Novelty</button>
                  {discoveryNovelty && (
                    <div className="p-4 bg-card border border-border rounded-lg space-y-4">
                      <div className="flex items-center justify-between"><span className="text-[10px] mono text-muted-foreground">NOVELTY_SCORE</span><span className={`text-lg font-black ${discoveryNovelty.score > 70 ? 'text-green-400' : 'text-orange-400'}`}>{discoveryNovelty.score}%</span></div>
                      <p className="text-[11px] text-foreground/80 leading-relaxed italic border-l border-border pl-3">{discoveryNovelty.critique}</p>
                    </div>
                  )}
                </div>
              </Section>
              {discoveryGaps && <Section title="Research Gaps" icon={<Compass size={12} />}><div className="text-[11px] leading-relaxed text-muted-foreground bg-card/20 p-5 rounded border border-border/50 whitespace-pre-wrap">{discoveryGaps}</div></Section>}
              {discoveryTrends && (
                <Section title="Trend Analysis" icon={<TrendingUp size={12} />}>
                  <div className="space-y-6">
                    <div className="grid gap-2">
                      <p className="text-[9px] font-bold text-green-400 uppercase tracking-widest">Trending</p>
                      {discoveryTrends.trending.map((t, i) => <div key={i} className="p-3 bg-green-400/5 border border-green-400/20 rounded"><h5 className="text-[10px] font-bold text-green-400">{t.topic}</h5><p className="text-[10px] text-muted-foreground">{t.reason}</p></div>)}
                    </div>
                  </div>
                </Section>
              )}
              {discoveryIdeas && (
                <Section title="Generated Ideas" icon={<Lightbulb size={12} />}>
                  <div className="space-y-4">
                    {discoveryIdeas.map((idea, i) => <div key={i} className="p-4 bg-card border border-border rounded-lg space-y-2 group hover:border-primary/30 transition-all"><h5 className="text-[11px] font-bold text-foreground uppercase tracking-tight">{idea.title}</h5><p className="text-[10px] text-muted-foreground italic">"{idea.rationale}"</p></div>)}
                  </div>
                </Section>
              )}
            </motion.div>
          )}

          {activeTab === 'critique' && role === 'reviewer' && (
            <motion.div key="critique" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-8">
              {(isDiscoveryLoading || isReviewerLoading) && <div className="flex flex-col items-center gap-3 py-12"><Loader2 className="animate-spin text-primary" size={24} /><p className="text-[10px] mono text-muted-foreground">AUDITING_METHODS...</p></div>}
              
              {/* Scoring Engine UI */}
              <Section title="Auto Scoring Engine" icon={<BarChart3 size={12} />}>
                <div className="space-y-4">
                  <button onClick={() => handleReviewerAction('scores')} className="w-full py-2 bg-foreground text-background text-[10px] font-bold uppercase rounded hover:opacity-90 transition-all shadow-sm">Evaluate Paper Metrics</button>
                  {reviewerScores && (
                    <div className="p-4 bg-card border border-border rounded-lg space-y-3">
                      <ScoreBar label="Clarity" score={reviewerScores.clarity} />
                      <ScoreBar label="Novelty" score={reviewerScores.novelty} />
                      <ScoreBar label="Validity" score={reviewerScores.validity} />
                      <ScoreBar label="Impact" score={reviewerScores.impact} />
                      <div className="pt-2 border-t border-border flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Overall Rating</span>
                        <span className="text-lg font-black text-primary">{reviewerScores.overall}/10</span>
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {/* Claim Verification UI */}
              <Section title="Claim Verification" icon={<ShieldCheck size={12} />}>
                <div className="space-y-4">
                  <button onClick={() => handleReviewerAction('claims')} className="w-full py-2 bg-accent/50 text-foreground text-[10px] font-bold uppercase rounded border border-border hover:bg-accent transition-all">Verify All Claims</button>
                  {reviewerClaims && (
                    <div className="space-y-2">
                      {reviewerClaims.map((c, i) => (
                        <div key={i} className="p-3 bg-card/20 border border-border/50 rounded-lg space-y-2">
                          <div className="flex items-start gap-2">
                            {c.status === 'supported' ? <CheckCircle2 size={12} className="text-green-400 shrink-0 mt-0.5" /> : c.status === 'unsupported' ? <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" /> : <HelpCircle size={12} className="text-orange-400 shrink-0 mt-0.5" />}
                            <p className="text-[10px] font-bold text-foreground leading-snug">{c.claim}</p>
                          </div>
                          <p className="text-[9px] text-muted-foreground italic pl-5 leading-relaxed">{c.context}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>

              {discoveryFlaws && (
                <Section title="Flaw Detection" icon={<AlertTriangle size={14} className="text-red-400" />}>
                  <div className="text-[11px] leading-relaxed text-red-200/80 bg-red-500/5 p-5 rounded border border-red-500/20 whitespace-pre-wrap">{discoveryFlaws}</div>
                </Section>
              )}

              {reviewerBias && (
                <Section title="Bias & Quality Report" icon={<Fingerprint size={12} />}>
                  <div className="text-[11px] leading-relaxed text-muted-foreground bg-card/20 p-5 rounded border border-border/50 whitespace-pre-wrap">{reviewerBias}</div>
                </Section>
              )}

              {/* Review Generator UI */}
              <Section title="AI Review Generator" icon={<FileText size={12} />}>
                <div className="space-y-4">
                  <button onClick={() => handleReviewerAction('report')} className="w-full py-3 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded hover:opacity-90 transition-all shadow-xl shadow-primary/10">Initialize Formal Review</button>
                  {reviewerReport && (
                    <div className="p-5 bg-background border border-border rounded-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="text-[9px] mono font-bold text-muted-foreground uppercase tracking-[0.2em]">Formal_Peer_Review_Output.md</span>
                        <button onClick={() => navigator.clipboard.writeText(reviewerReport)} className="text-[9px] font-bold text-primary hover:underline">COPY_RAW</button>
                      </div>
                      <div className="text-[11px] leading-relaxed text-foreground/80 whitespace-pre-wrap font-sans prose prose-invert prose-xs">{reviewerReport}</div>
                    </div>
                  )}
                </div>
              </Section>
            </motion.div>
          )}

          {activeTab === 'podcast' && role === 'student' && (
            <motion.div key="podcast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-8">
              <Section title="Podcast Learning Mode" icon={<Mic2 size={14} />}>
                <div className="bg-accent/10 border border-border rounded-xl p-6 flex flex-col items-center text-center space-y-6">

                  {/* Idle — no podcast yet */}
                  {podcastStatus === 'idle' && (
                    <>
                      <div className="w-16 h-16 bg-foreground/10 border border-border rounded-full flex items-center justify-center text-muted-foreground"><Volume2 size={28} /></div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-foreground/80">No podcast generated yet</p>
                        <p className="text-[10px] text-muted-foreground mono">Select a paper and click <span className="text-foreground">Generate Podcast</span> in the sidebar</p>
                      </div>
                    </>
                  )}

                  {/* Processing — spinner + progress hint */}
                  {podcastStatus === 'processing' && (
                    <>
                      <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center text-background shadow-2xl animate-pulse"><Volume2 size={32} /></div>
                      <div className="space-y-2">
                        <Loader2 className="animate-spin text-muted-foreground mx-auto" size={22} />
                        <p className="text-[10px] mono text-muted-foreground">Generating script &amp; synthesising audio…</p>
                      </div>
                      {/* Show script preview while waiting */}
                      {podcastScript && podcastScript.length > 0 && (
                        <p className="text-[10px] text-muted-foreground italic">Script ready — encoding audio…</p>
                      )}
                    </>
                  )}

                  {/* Error */}
                  {podcastStatus === 'error' && (
                    <>
                      <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400"><Volume2 size={28} /></div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-red-400">Generation failed</p>
                        <p className="text-[10px] text-muted-foreground mono">Check the server logs and try again</p>
                      </div>
                    </>
                  )}

                  {/* Ready — player */}
                  {podcastStatus === 'ready' && podcastAudioUrl && (
                    <>
                      <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center text-background shadow-2xl"><Volume2 size={32} /></div>
                      <audio ref={audioRef} src={`${API_BASE_URL}${podcastAudioUrl}`} onEnded={() => setIsPlaying(false)} />
                      <div className="flex items-center gap-4">
                        <button
                          onClick={togglePlayback}
                          className="w-14 h-14 bg-foreground text-background rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                          {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
                        </button>
                      </div>
                      <p className="text-[9px] mono text-muted-foreground uppercase tracking-widest">Research Radio · Alex &amp; Jamie</p>
                    </>
                  )}
                </div>
              </Section>

              {/* Script — show for processing (preview) and ready */}
              {podcastScript && podcastScript.length > 0 && (podcastStatus === 'ready' || podcastStatus === 'processing') && (
                <Section title="Transcript" icon={<Terminal size={12} />}>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                    {podcastScript.map((line, i) => (
                      <div key={i} className={`p-3 rounded-lg border border-border/30 ${line.speaker === 'Alex' ? 'bg-card/30' : 'bg-accent/5'}`}>
                        <span className={`text-[9px] mono font-bold uppercase tracking-widest block mb-1 ${line.speaker === 'Alex' ? 'text-primary/70' : 'text-muted-foreground'}`}>{line.speaker}</span>
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
                  <div className="flex items-center justify-between"><h4 className="text-[10px] font-semibold text-muted-foreground mono">GRAPH_TOPOLOGY</h4><div className="flex gap-1.5"><button onClick={() => setFocusedPaperId(isFocused ? null : selectedPaperId)} className={`p-1.5 rounded transition-all border ${isFocused ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:text-foreground'}`} title={isFocused ? "Clear Focus" : "Focus on Graph"}><Activity size={12} /></button></div></div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2"><Database size={12} className="text-muted-foreground" /><span className="text-[10px] font-semibold text-muted-foreground mono">{`REFERENCES [${selectedPaper.reference_ids?.length || 0}]`}</span></div>
                    <div className="space-y-1.5">
                      {selectedPaper.reference_ids?.map((refId: number) => {
                        const refPaper = papers.find(p => p.id === refId);
                        return <div key={refId} className="group flex items-center gap-3 p-2.5 bg-card/5 border border-border/30 rounded hover:border-border/60 transition-colors"><div className="w-1 h-1 bg-foreground/40 rounded-full shrink-0" /><div className="flex-1 min-w-0"><p className="text-[11px] font-medium text-foreground/90 truncate">{refPaper?.title || `Paper #${refId}`}</p></div></div>;
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
          <input type="text" placeholder={selectedPaper ? `Query research stream...` : `Select source...`} className="w-full bg-background border border-border rounded py-2 pl-3 pr-10 text-[11px] mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/30 transition-all" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuery()} disabled={loading || !selectedPaperId} />
          <button onClick={() => handleQuery()} disabled={loading || !selectedPaperId} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors">{loading ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}</button>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] mono transition-all whitespace-nowrap ${active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
    {icon}{label}
  </button>
);

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-[10px] mono text-muted-foreground/60 uppercase tracking-wider">{icon}{title}</div>
    {children}
  </div>
);

const ScoreBar = ({ label, score }: { label: string, score: number }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-[9px] mono font-bold text-muted-foreground">
      <span className="uppercase tracking-widest">{label}</span>
      <span className="text-foreground">{score}/10</span>
    </div>
    <div className="h-1 bg-border/40 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${score * 10}%` }} className="h-full bg-primary" />
    </div>
  </div>
);

const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
    <div className="p-4 bg-card/20 rounded-full text-muted-foreground">{icon}</div>
    <p className="text-[10px] mono text-muted-foreground max-w-[160px]">{message}</p>
  </div>
);

export default RightPanel;
