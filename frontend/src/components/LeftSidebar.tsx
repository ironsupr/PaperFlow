import { useRef, useState } from 'react';
import { 
  GraduationCap, 
  Microscope, 
  ShieldCheck, 
  Plus, 
  Trash2,
  FileText,
  Library,
  GitCompare,
  Mic2,
  CheckSquare,
  Square,
  Compass,
  TrendingUp,
  Lightbulb,
  Layers,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../api/client';
import ContextMenu from './ContextMenu';

const LeftSidebar = () => {
  const { 
    role, 
    setIsProcessing, 
    fetchPapers, 
    papers, 
    selectedPaperId,
    selectedMultiPaperIds,
    toggleMultiPaperSelection,
    setCrossPaperAnalysis,
    setPodcastData,
    setDiscoveryState,
    setActiveIntelligenceTab,
    setActiveReaderId,
    activeReaderId
  } = useStore();
  
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsProcessing(true);
      try {
        for (let i = 0; i < files.length; i++) {
          await api.uploadPaper(files[i]);
        }
        await fetchPapers();
        setTimeout(() => fetchPapers(), 1500);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCompare = async () => {
    if (selectedMultiPaperIds.length < 2) return alert("Select at least 2 papers.");
    setIsProcessing(true);
    setActiveIntelligenceTab('intelligence');
    try {
      const res = await api.crossPaperAnalysis(selectedMultiPaperIds);
      setCrossPaperAnalysis(res.analysis);
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePodcast = async () => {
    const targetIds = selectedMultiPaperIds.length > 0
      ? selectedMultiPaperIds
      : activeReaderId ? [activeReaderId] : [];
    if (targetIds.length === 0) return alert("Open or select a paper first.");
    setActiveIntelligenceTab('podcast');
    setPodcastData({ status: 'processing', url: null, script: null });
    try {
      const res = await api.generatePodcast(targetIds);
      setPodcastData({ status: res.status || 'ready', url: res.audio_url, script: res.script });
    } catch (error) {
      console.error('Podcast generation failed:', error);
      setPodcastData({ status: 'error', url: null, script: null });
    }
  };

  const handleDiscoveryAction = async (tool: string) => {
    // Determine effective target IDs: prefer multi-selection, fallback to active reader
    let targetIds = selectedMultiPaperIds;
    if (targetIds.length === 0 && activeReaderId) {
      targetIds = [activeReaderId];
    }

    if (targetIds.length < 1 && tool !== 'novelty') return alert("Select a paper in the library or open one to begin.");
    
    if (tool === 'novelty') {
      setActiveIntelligenceTab('discovery');
      setDiscoveryState({ discoveryNovelty: null });
      return;
    }

    setActiveIntelligenceTab(tool === 'flaws' ? 'critique' : 'discovery');
    setDiscoveryState({ isDiscoveryLoading: true, discoveryError: null });
    try {
      let res;
      switch(tool) {
        case 'gaps':
          res = await api.detectResearchGaps(targetIds);
          setDiscoveryState({ discoveryGaps: res.gaps });
          break;
        case 'trends':
          res = await api.analyzeTrends(targetIds);
          setDiscoveryState({ discoveryTrends: res });
          break;
        case 'ideas':
          const risk = window.prompt("Risk Level? (safe, moderate, moonshot)", "moderate") || "moderate";
          res = await api.generateIdeas(targetIds, risk);
          setDiscoveryState({ discoveryIdeas: res.ideas });
          break;
        case 'methods':
          res = await api.compareMethods(targetIds);
          setDiscoveryState({ discoveryMethods: res.comparison });
          break;
        case 'flaws':
          res = await api.detectFlaws(targetIds);
          setDiscoveryState({ discoveryFlaws: res.flaws });
          break;
      }
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Analysis failed. Please try again.';
      setDiscoveryState({ discoveryError: msg });
      console.error(`Discovery tool ${tool} failed:`, error);
    } finally {
      setDiscoveryState({ isDiscoveryLoading: false });
    }
  };

  const onPaperContextMenu = (e: React.MouseEvent, paperId: number) => {
    e.preventDefault();
    setMenu({
      id: String(paperId),
      top: e.clientY,
      left: e.clientX
    });
  };

  const handleClearWorkspace = async () => {
    if (window.confirm("Clear entire workspace?")) {
      try {
        await api.clearWorkspace();
        useStore.getState().clearStore();
      } catch (error) {
        console.error('Failed to clear workspace:', error);
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-transparent overflow-hidden select-none" onClick={() => setMenu(null)}>
      {/* Library Header */}
      <div className="px-4 py-3 flex items-center justify-between group">
        <div className="flex items-center gap-2">
          <Library size={14} className="text-muted-foreground" />
          <h2 className="text-xs font-semibold text-foreground/80">Library</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onUploadClick} className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors" title="Upload PDF(s)">
            <Plus size={14} />
          </button>
          <span className="text-[9px] mono text-muted-foreground bg-accent px-1 rounded ml-1">{papers.length}</span>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" multiple onChange={onFileChange} />
      </div>

      {/* Role-Based Actions */}
      <div className="px-2 pb-3 space-y-2 border-b border-border/50">
        <button 
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-foreground text-background text-[11px] font-bold uppercase hover:opacity-90 transition-all shadow-sm"
        >
          <Plus size={16} /> Upload Papers
        </button>
        
        <div className="flex gap-1">
          {role === 'student' && (
            <button onClick={handleGeneratePodcast} disabled={selectedMultiPaperIds.length === 0 && !activeReaderId} className="w-full flex items-center justify-center gap-2 py-2 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase hover:bg-primary/20 disabled:opacity-30 transition-all">
              <Mic2 size={14} /> Generate Podcast
            </button>
          )}
          {role === 'researcher' && (
            <>
              <button onClick={handleCompare} disabled={selectedMultiPaperIds.length < 2} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-accent/30 text-[10px] font-semibold text-foreground hover:bg-accent disabled:opacity-30 transition-all">
                <GitCompare size={12} /> Compare
              </button>
              <button onClick={() => handleDiscoveryAction('ideas')} disabled={selectedMultiPaperIds.length === 0} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-accent/30 text-[10px] font-semibold text-foreground hover:bg-accent disabled:opacity-30 transition-all">
                <Lightbulb size={12} /> Propose
              </button>
            </>
          )}
          {role === 'reviewer' && (
            <>
              <button onClick={() => handleDiscoveryAction('methods')} disabled={selectedMultiPaperIds.length < 2} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-accent/30 text-[10px] font-semibold text-foreground hover:bg-accent disabled:opacity-30 transition-all">
                <Layers size={12} /> Audit Methods
              </button>
              <button onClick={() => handleDiscoveryAction('flaws')} disabled={selectedMultiPaperIds.length === 0} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold hover:bg-red-500/20 disabled:opacity-30 transition-all">
                <AlertTriangle size={12} /> Find Flaws
              </button>
            </>
          )}
        </div>
      </div>

      {/* Role-Based Modules */}
      {role === 'researcher' && (
        <div className="px-2 py-3 space-y-1 border-b border-border/50 bg-accent/5">
          <p className="px-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Research Discovery</p>
          <div className="grid grid-cols-2 gap-1">
            <ToolButton icon={<Compass size={12} />} label="Gap Finder" onClick={() => handleDiscoveryAction('gaps')} />
            <ToolButton icon={<TrendingUp size={12} />} label="Trends" onClick={() => handleDiscoveryAction('trends')} />
            <ToolButton icon={<Fingerprint size={12} />} label="Novelty" onClick={() => handleDiscoveryAction('novelty')} />
            <ToolButton icon={<GitCompare size={12} />} label="Compare" onClick={handleCompare} />
          </div>
        </div>
      )}

      {/* Paper List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pt-2 space-y-0.5">
        {papers.map((paper) => {
          const isSelected = selectedMultiPaperIds.includes(paper.id);
          return (
            <div key={paper.id} className="group flex items-center gap-1">
              <button onClick={() => toggleMultiPaperSelection(paper.id)} className={`p-1 rounded hover:bg-accent transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground/30'}`}>
                {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
              </button>
              <button 
                onClick={() => setActiveReaderId(paper.id)}
                onContextMenu={(e) => onPaperContextMenu(e, paper.id)}
                className={`flex-1 flex items-center gap-2 px-2 py-1 rounded transition-all group ${selectedPaperId === paper.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground/80'}`}
              >
                <FileText size={14} className={selectedPaperId === paper.id ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground/60'} />
                <span className="flex-1 text-[11px] font-normal truncate text-left">{paper.title}</span>
              </button>
            </div>
          );
        })}
        {papers.length === 0 && (
          <div className="py-20 px-4 text-center space-y-4">
            <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
              <Plus size={24} className="text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-foreground font-semibold uppercase tracking-wider">Empty Library</p>
              <p className="text-[10px] text-muted-foreground font-medium italic">Ready for analysis.</p>
            </div>
            <button onClick={onUploadClick} className="px-6 py-2 bg-foreground text-background text-[10px] font-bold uppercase rounded shadow-lg hover:opacity-90 transition-all inline-flex items-center gap-2">
              Upload Your First PDF
            </button>
          </div>
        )}
      </div>

      {/* Technical Modes Selector */}
      <div className="mt-auto border-t border-border/50 bg-card/10 p-2 space-y-1">
        <SidebarItem icon={<GraduationCap size={14} />} label="Student" active={role === 'student'} onClick={() => useStore.getState().setRole('student')} />
        <SidebarItem icon={<Microscope size={14} />} label="Researcher" active={role === 'researcher'} onClick={() => useStore.getState().setRole('researcher')} />
        <SidebarItem icon={<ShieldCheck size={14} />} label="Reviewer" active={role === 'reviewer'} onClick={() => useStore.getState().setRole('reviewer')} />
        <div className="pt-1 border-t border-border/50">
          <SidebarItem icon={<Trash2 size={14} />} label="Clear Env" onClick={handleClearWorkspace} danger />
        </div>
      </div>

      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
};

const ToolButton = ({ icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded border border-border/30 hover:border-foreground/20 hover:bg-background transition-all">
    <div className="text-muted-foreground group-hover:text-foreground">{icon}</div>
    <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
  </button>
);

const SidebarItem = ({ icon, label, active, onClick, danger }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-2 py-1 rounded transition-all ${active ? 'bg-accent text-foreground' : danger ? 'text-muted-foreground hover:text-red-400 hover:bg-red-950/10' : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground/80'}`}>
    {icon}
    <span className="flex-1 text-[11px] font-medium">{label}</span>
    {active && <div className="w-1 h-1 rounded-full bg-foreground" />}
  </button>
);

export default LeftSidebar;
