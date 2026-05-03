import { useRef } from 'react';
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
  Square
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../api/client';

const LeftSidebar = () => {
  const { 
    role, 
    setRole, 
    setIsProcessing, 
    fetchPapers, 
    papers, 
    setSelectedPaperId, 
    selectedPaperId,
    selectedMultiPaperIds,
    toggleMultiPaperSelection,
    setCrossPaperAnalysis,
    setPodcastData
  } = useStore();
  
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
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCompare = async () => {
    if (selectedMultiPaperIds.length < 2) {
      alert("Select at least 2 papers to compare.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await api.crossPaperAnalysis(selectedMultiPaperIds);
      setCrossPaperAnalysis(res.analysis);
      // Automatically open intelligence panel or set a tab
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePodcast = async () => {
    if (selectedMultiPaperIds.length === 0) {
      alert("Select at least one paper for the podcast.");
      return;
    }
    setPodcastData({ status: 'processing', url: null, script: null });
    try {
      const res = await api.generatePodcast(selectedMultiPaperIds);
      setPodcastData({ status: 'processing', url: res.audio_url, script: res.script });
      // Logic to poll for status or just wait
    } catch (error) {
      console.error('Podcast generation failed:', error);
      setPodcastData({ status: 'error', url: null, script: null });
    }
  };

  const handleClearWorkspace = async () => {
    if (window.confirm("Are you sure you want to clear your entire workspace? This will delete all papers and citations permanently.")) {
      try {
        await api.clearWorkspace();
        useStore.getState().clearStore();
      } catch (error) {
        console.error('Failed to clear workspace:', error);
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-transparent overflow-hidden select-none">
      {/* Sidebar Header */}
      <div className="px-4 py-3 flex items-center justify-between group">
        <div className="flex items-center gap-2">
          <Library size={14} className="text-muted-foreground" />
          <h2 className="text-xs font-semibold text-foreground/80">Library</h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onUploadClick}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Upload PDF(s)"
          >
            <Plus size={14} />
          </button>
          <span className="text-[9px] mono text-muted-foreground bg-accent px-1 rounded ml-1">{papers.length}</span>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf"
          multiple
          onChange={onFileChange}
        />
      </div>

      {/* Intelligence Actions */}
      <div className="px-2 pb-3 flex gap-1 border-b border-border/50">
        <button 
          onClick={handleCompare}
          disabled={selectedMultiPaperIds.length < 2}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-accent/50 text-[10px] font-semibold text-foreground hover:bg-accent disabled:opacity-30 transition-all"
        >
          <GitCompare size={12} /> Compare
        </button>
        <button 
          onClick={handleGeneratePodcast}
          disabled={selectedMultiPaperIds.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-accent/50 text-[10px] font-semibold text-foreground hover:bg-accent disabled:opacity-30 transition-all"
        >
          <Mic2 size={12} /> Podcast
        </button>
      </div>

      {/* Paper List - Tree Style */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pt-2 space-y-0.5">
        {papers.map((paper) => {
          const isSelected = selectedMultiPaperIds.includes(paper.id);
          return (
            <div key={paper.id} className="group flex items-center gap-1">
              <button 
                onClick={() => toggleMultiPaperSelection(paper.id)}
                className={`p-1 rounded hover:bg-accent transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground/40'}`}
              >
                {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
              </button>
              <button
                onClick={() => setSelectedPaperId(paper.id)}
                className={`flex-1 flex items-center gap-2 px-2 py-1 rounded transition-all group ${
                  selectedPaperId === paper.id 
                    ? 'bg-accent text-foreground' 
                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground/80'
                }`}
              >
                <FileText size={14} className={selectedPaperId === paper.id ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground/60'} />
                <span className="flex-1 text-[11px] font-normal truncate text-left">
                  {paper.title}
                </span>
                <span className="text-[9px] mono opacity-0 group-hover:opacity-40">.pdf</span>
              </button>
            </div>
          );
        })}
        {papers.length === 0 && (
          <div className="py-12 px-4 text-center">
            <p className="text-[10px] text-muted-foreground font-medium italic">Empty workspace</p>
          </div>
        )}
      </div>

      {/* Technical Modes */}
      <div className="mt-auto border-t border-border/50 bg-card/10">
        <div className="px-4 py-2">
          <p className="text-[10px] font-semibold text-muted-foreground/60 mb-2">Neural Perspective</p>
          <div className="space-y-1">
            <SidebarItem 
              icon={<GraduationCap size={14} />} 
              label="Student" 
              active={role === 'student'} 
              onClick={() => setRole('student')}
            />
            <SidebarItem 
              icon={<Microscope size={14} />} 
              label="Researcher" 
              active={role === 'researcher'} 
              onClick={() => setRole('researcher')}
            />
            <SidebarItem 
              icon={<ShieldCheck size={14} />} 
              label="Reviewer" 
              active={role === 'reviewer'} 
              onClick={() => setRole('reviewer')}
            />
          </div>
        </div>

        {/* System Operations */}
        <div className="px-4 py-2 border-t border-border/50">
          <SidebarItem 
            icon={<Trash2 size={14} />} 
            label="Clear Environment" 
            onClick={handleClearWorkspace}
            danger
          />
        </div>
      </div>
    </div>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  danger?: boolean;
}

const SidebarItem = ({ icon, label, active, onClick, danger }: SidebarItemProps) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-2 py-1 rounded transition-all ${
      active 
        ? 'bg-accent text-foreground' 
        : danger
          ? 'text-muted-foreground hover:text-red-400 hover:bg-red-950/10'
          : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground/80'
    }`}
  >
    <div className={active ? 'text-foreground' : ''}>
      {icon}
    </div>
    <span className="flex-1 text-[11px] font-medium">{label}</span>
    {active && <div className="w-1 h-1 rounded-full bg-foreground" />}
  </button>
);

export default LeftSidebar;
