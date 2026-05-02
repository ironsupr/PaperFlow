import { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  Sparkles, BookOpen, Search, Shield, Zap, MessageSquare, Loader2, GitBranch, Plus, 
  ExternalLink, ChevronRight, User, Info, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';

const RightPanel = () => {
  const { role, selectedPaperId, papers, fetchPapers, setFocusedPaperId, focusedPaperId } = useStore();
  const [activeTab, setActiveTab] = useState<'intelligence' | 'citations'>('intelligence');
  const [query, setQuery] = useState('');
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddRef, setShowAddRef] = useState(false);

  const selectedPaper = papers.find(p => p.id === selectedPaperId);
  const otherPapers = papers.filter(p => p.id !== selectedPaperId && !selectedPaper?.reference_ids?.includes(p.id));
  const isFocused = focusedPaperId === selectedPaperId;

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.queryAI(query, selectedPaperId || undefined);
      setResponses([...responses, { query, answer: res.answer }]);
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

  const renderCitations = () => {
    if (!selectedPaper) return null;

    return (
      <div className="space-y-4">
        {/* Header with Focus and Add */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600/20 rounded-lg text-blue-400">
              <GitBranch size={16} />
            </div>
            <h4 className="text-white font-bold text-sm tracking-tight">Citation Network</h4>
          </div>
          <div className="flex gap-1.5">
            <button 
              onClick={() => setFocusedPaperId(isFocused ? null : selectedPaperId)}
              className={`p-1.5 rounded-lg transition-all duration-300 shadow-lg ${isFocused ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-blue-400'}`}
              title={isFocused ? "Clear Focus" : "Focus Graph"}
            >
              <Zap size={14} fill={isFocused ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => setShowAddRef(!showAddRef)}
              className={`p-1.5 rounded-lg transition-all ${showAddRef ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Add Reference Dropdown */}
        <AnimatePresence>
          {showAddRef && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-slate-800/50 border border-white/5 rounded-xl"
            >
              <div className="p-3 space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Connect Local Paper</p>
                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                  {otherPapers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAddReference(p.id)}
                      className="w-full text-left p-2 hover:bg-blue-600/20 rounded-lg text-[11px] text-slate-300 transition-colors truncate flex items-center gap-2 group"
                    >
                      <Plus size={10} className="text-slate-600 group-hover:text-blue-400" />
                      {p.title}
                    </button>
                  ))}
                  {otherPapers.length === 0 && <p className="text-xs text-slate-500 italic p-2 text-center">No papers to link</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* References List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              References ({selectedPaper.reference_ids?.length || 0})
            </span>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedPaper.reference_ids?.map((refId: number) => {
              const refPaper = papers.find(p => p.id === refId);
              const isExternal = refPaper?.is_external === 1;
              return (
                <div
                  key={refId}
                  className="group relative flex items-center gap-3 p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isExternal ? "bg-slate-600" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-medium truncate ${isExternal ? 'text-slate-400' : 'text-slate-200'}`}>
                      {refPaper?.title || `Paper #${refId}`}
                    </p>
                    {refPaper?.authors && (
                      <p className="text-[9px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <User size={8} /> {refPaper.authors}
                      </p>
                    )}
                  </div>
                  {isExternal && refPaper?.scholar_url && (
                    <a
                      href={refPaper.scholar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-slate-800 rounded-lg text-slate-500 hover:text-blue-400 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                    >
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              );
            })}
            {(!selectedPaper.reference_ids || selectedPaper.reference_ids.length === 0) && (
              <div className="py-8 text-center bg-white/5 border border-dashed border-white/5 rounded-2xl">
                <p className="text-xs text-slate-600 font-medium">No references found yet</p>
                <p className="text-[10px] text-slate-700 mt-1">Citations appear as background search completes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRoleSpecificContent = () => {
    const contents = {
      student: {
        icon: <BookOpen size={16} />,
        title: 'Concept Summary',
        color: 'blue',
        text: 'This paper introduces the fundamental principles of qubit coherence times and their impact on quantum computing scalability...',
        action: 'Generate Audio Explanation'
      },
      researcher: {
        icon: <Search size={16} />,
        title: 'Gap Detection',
        color: 'emerald',
        text: 'Identified a research gap in error correction for superconducting circuits specifically in high-temperature environments...',
        action: 'Expand Search'
      },
      reviewer: {
        icon: <Shield size={16} />,
        title: 'Flaw Detection',
        color: 'red',
        text: 'Critical logical gap in Theorem 3.2: The assumption of noise independence may not hold under these specific conditions.',
        action: 'Generate Official Report'
      }
    };

    const config = contents[role as keyof typeof contents];

    return (
      <div className="space-y-4 pt-2">
        <div className={`p-4 bg-${config.color}-500/5 border border-${config.color}-500/20 rounded-2xl`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 bg-${config.color}-500/20 rounded-lg text-${config.color}-400`}>
              {config.icon}
            </div>
            <h4 className="text-white font-bold text-sm tracking-tight">{config.title}</h4>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed italic">
            "{config.text}"
          </p>
          {role === 'researcher' && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[9px] text-orange-500 font-bold uppercase tracking-widest">Novelty Score</span>
                <span className="text-[10px] text-white font-bold">75%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-orange-600 to-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]" 
                />
              </div>
            </div>
          )}
          <button className={`w-full mt-4 py-2 bg-${config.color}-600/80 hover:bg-${config.color}-600 rounded-xl text-[10px] font-bold text-white transition-all shadow-lg active:scale-[0.98]`}>
            {config.action}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/5 flex flex-col bg-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="text-yellow-400" size={20} />
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-yellow-400 blur-lg opacity-50" 
              />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-tight leading-none">Intelligence</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">{role} agent active</p>
            </div>
          </div>
          <div className="p-2 bg-white/5 rounded-full">
            <Info size={14} className="text-slate-600" />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/40 rounded-xl">
          <button
            onClick={() => setActiveTab('intelligence')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'intelligence' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Zap size={12} fill={activeTab === 'intelligence' ? 'currentColor' : 'none'} />
            Insights
          </button>
          <button
            onClick={() => setActiveTab('citations')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'citations' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <GitBranch size={12} />
            Citations
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
        {selectedPaper ? (
          <>
            {/* Selected Paper Brief */}
            <div className="px-1">
              <h2 className="text-white font-bold text-lg leading-tight line-clamp-2">{selectedPaper.title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                  <User size={10} /> {selectedPaper.authors || 'Unknown Authors'}
                </span>
                <div className="w-1 h-1 bg-slate-700 rounded-full" />
                <span className="flex items-center gap-1 text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                  <Database size={10} /> {selectedPaper.is_external ? 'External' : 'Local'}
                </span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'intelligence' ? (
                <motion.div
                  key="intelligence"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {renderRoleSpecificContent()}

                  <div className="space-y-4 pt-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Insight History</span>
                    {responses.map((res, i) => (
                      <div key={i} className="space-y-2 group">
                        <div className="flex justify-end">
                          <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl rounded-tr-none p-3 text-[11px] text-slate-200 max-w-[85%] shadow-sm">
                            {res.query}
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3 text-[11px] text-slate-300 max-w-[90%] leading-relaxed">
                            {res.answer}
                          </div>
                        </div>
                      </div>
                    ))}
                    {responses.length === 0 && (
                      <div className="py-10 text-center bg-white/5 rounded-2xl border border-dashed border-white/5">
                        <MessageSquare size={20} className="text-slate-700 mx-auto mb-2" />
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No conversation yet</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="citations"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderCitations()}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-20">
            <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 relative">
              <BookOpen size={24} className="text-blue-500" />
              <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
            </div>
            <h4 className="text-white font-bold text-base mb-2">No Paper Selected</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
              Select a paper from the graph to begin deep analysis and citation exploration.
            </p>
          </div>
        )}
      </div>

      {/* Input Section */}
      {activeTab === 'intelligence' && (
        <div className="p-5 bg-white/5 border-t border-white/5">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-600/10 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <input
              type="text"
              placeholder={selectedPaper ? `Ask about this paper...` : `Select a paper...`}
              className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all relative z-10 shadow-inner"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              disabled={loading || !selectedPaperId}
            />
            <button 
              onClick={handleQuery}
              disabled={loading || !selectedPaperId}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:opacity-50 rounded-xl text-white transition-all shadow-lg active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;
