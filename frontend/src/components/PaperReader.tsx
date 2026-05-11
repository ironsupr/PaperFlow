import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Worker, Viewer, RotateDirection } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { highlightPlugin } from '@react-pdf-viewer/highlight';
import type { RenderHighlightTargetProps, RenderHighlightsProps, HighlightArea } from '@react-pdf-viewer/highlight';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import { useStore } from '../store/useStore';
import {
  X, Save, List, Zap, Sparkles, Loader2, Bookmark,
  Tag, Download, Shield, EyeOff, Minimize2, Send,
  BarChart3, ShieldCheck, Microscope, Pencil, Trash2, Check,
  ExternalLink, FileText, Users, Calendar, MapPin
} from 'lucide-react';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import MarkdownText from './MarkdownText';

interface PaperReaderProps {
  isMaximized?: boolean;
}

const PaperReader = ({ isMaximized = false }: PaperReaderProps) => {
  const { 
    activeReaderId, 
    setActiveReaderId, 
    papers, 
    fetchPapers, 
    token, 
    user,
    maximizedReaderId,
    setMaximizedReaderId
  } = useStore();
  
  const readerId = isMaximized ? maximizedReaderId : activeReaderId;
  const paper = papers.find(p => p.id === readerId);
  
  const [highlights, setHighlights] = useState<Array<{ content: string; note: string; tags: string[]; position: HighlightArea | null; highlightAreas?: HighlightArea[] }>>([]);
  const [activeHighlightIndex, setActiveHighlightIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingNote, setEditingNote] = useState('');
  // Refs so renderHighlights callback always reads current values without recreating the plugin
  const highlightsRef = useRef(highlights);
  highlightsRef.current = highlights;
  const activeHighlightIndexRef = useRef(activeHighlightIndex);
  activeHighlightIndexRef.current = activeHighlightIndex;
  // Ref to the floating assistant — lets the intelligence bar trigger queries
  // without causing the PDF viewer's parent to re-render
  const assistantRef = useRef<AssistantHandle>(null);
  const [showSections, setShowSections] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  // Secure Reader State
  const [isSecureShieldActive, setIsSecureShieldActive] = useState(false);

  const handleSecurityTrigger = useCallback(() => {
    setIsSecureShieldActive(true);
  }, []);

  const clearSecurityTrigger = useCallback(() => {
    setIsSecureShieldActive(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        alert("Secure Reader: Printing is disabled to protect research integrity.");
      }
      if (e.key === 'PrintScreen') {
        handleSecurityTrigger();
        setTimeout(clearSecurityTrigger, 3000);
      }
    };

    window.addEventListener('blur', handleSecurityTrigger);
    window.addEventListener('focus', clearSecurityTrigger);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleSecurityTrigger);
      window.removeEventListener('focus', clearSecurityTrigger);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSecurityTrigger, clearSecurityTrigger]);

  const renderHighlightTarget = (props: RenderHighlightTargetProps) => (
    <div
      className="absolute z-[100] flex items-center gap-1 bg-card border border-border rounded-md shadow-xl p-1 animate-in zoom-in-95"
      style={{
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
      }}
    >
      <button
        className="flex items-center gap-2 px-2 py-1 text-[9px] font-bold text-foreground hover:bg-accent rounded transition-all"
        onClick={() => {
          const note = window.prompt("Add a note to this highlight:");
          const tagsInput = window.prompt("Add tags (comma separated):");
          if (note !== null) {
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];
            const newHighlight = {
              content: props.selectedText,
              note: note,
              tags: tags,
              position: props.selectionRegion,
              highlightAreas: props.highlightAreas,
            };
            const updated = [...highlights, newHighlight];
            setHighlights(updated);
            saveHighlights(updated);

            api.createNote(readerId!, {
              content: note,
              tags: tags,
              position_data: { selectionRegion: props.selectionRegion, highlightAreas: props.highlightAreas }
            });
          }
        }}
      >
        <Save size={12} /> Highlight
      </button>
      <div className="w-px h-3 bg-border" />
      <button
        className="flex items-center gap-2 px-2 py-1 text-[9px] font-bold text-primary hover:bg-accent rounded transition-all"
        onClick={() => handleExplain(props.selectedText)}
      >
        <Zap size={12} fill="currentColor" /> Explain
      </button>
      {isMaximized && (
        <>
          <div className="w-px h-3 bg-border" />
          <button
            className="flex items-center gap-2 px-2 py-1 text-[9px] font-bold text-orange-400 hover:bg-accent rounded transition-all"
            onClick={() => assistantRef.current?.query(`Critically analyze this selection: "${props.selectedText}"`)}
          >
            <Microscope size={12} /> Critique
          </button>
        </>
      )}
    </div>
  );

  const renderHighlights = useCallback((props: RenderHighlightsProps) => {
    const overlays = highlightsRef.current.flatMap((h, i) => {
      const areas: HighlightArea[] = h.highlightAreas?.length
        ? h.highlightAreas
        : h.position ? [h.position] : [];
      return areas
        .filter(area => area.pageIndex === props.pageIndex)
        .map((area, j) => (
          <div
            key={`${i}-${j}`}
            style={{
              ...props.getCssProperties(area, props.rotation),
              position: 'absolute',
              background: activeHighlightIndexRef.current === i
                ? 'rgba(251, 191, 36, 0.55)'
                : 'rgba(251, 191, 36, 0.25)',
              borderRadius: '2px',
              transition: 'background 0.3s ease',
              pointerEvents: 'none',
            }}
          />
        ));
    });
    return <div>{overlays}</div>;
  }, []);

  const highlightPluginInstance = highlightPlugin({ renderHighlightTarget, renderHighlights });
  const { jumpToHighlightArea } = highlightPluginInstance;

  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [],
    renderToolbar: (Toolbar) => (
      <Toolbar>
        {(props) => {
          const {
            CurrentScale, ZoomIn, ZoomOut, EnterFullScreen, Rotate, ShowSearchPopover,
            GoToNextPage, GoToPreviousPage, NumberOfPages, CurrentPageInput
          } = props;
          return (
            <div className="flex items-center justify-between w-full px-2 py-1 bg-card border-b border-border">
              <div className="flex items-center gap-2">
                <div className="scale-75 origin-left"><ShowSearchPopover /></div>
                <div className="w-px h-4 bg-border mx-1" />
                <div className="flex items-center gap-1 scale-90">
                  <GoToPreviousPage /><CurrentPageInput />
                  <span className="text-[10px] text-muted-foreground mr-1">/ <NumberOfPages /></span>
                  <GoToNextPage />
                </div>
              </div>
              <div className="flex items-center gap-1 scale-90">
                <ZoomOut /><div className="w-16 flex justify-center"><CurrentScale /></div><ZoomIn />
              </div>
              <div className="flex items-center gap-1 scale-90">
                <Rotate direction={RotateDirection.Forward} /><EnterFullScreen />
              </div>
            </div>
          );
        }}
      </Toolbar>
    ),
  });

  const handleJumpToAnnotation = useCallback((index: number) => {
    const h = highlightsRef.current[index];
    if (!h) return;
    const area = h.highlightAreas?.[0] ?? h.position;
    if (!area) return;
    setActiveHighlightIndex(index);
    jumpToHighlightArea(area);
    setTimeout(() => setActiveHighlightIndex(null), 2500);
  }, [jumpToHighlightArea]);

  useEffect(() => {
    const paperHighlights = (paper?.highlights || []).map((h: any) => ({
      ...h,
      tags: h.tags || []
    }));
    setHighlights(paperHighlights);
  }, [paper]);



  const handleExplain = async (text: string) => {
    if (!readerId) return;
    setExplanationLoading(true);
    try {
      const res = await api.explainText(text, readerId);
      setExplanation(res.explanation);
    } catch (error) {
      console.error('Explanation failed:', error);
    } finally {
      setExplanationLoading(false);
    }
  };

  const saveHighlights = async (updated: Array<{ content: string; note: string; tags: string[]; position: unknown }>) => {
    if (!readerId) return;
    try {
      await api.updateHighlights(readerId, updated);
      await fetchPapers();
    } catch (error) {
      console.error('Failed to save highlights:', error);
    }
  };

  const exportNotes = () => {
    if (!paper) return;
    const content = highlights.map((h, i) => (
      `## Annotation ${i + 1}\n` +
      `**Selection:** ${h.content}\n` +
      `**Note:** ${h.note}\n` +
      `**Tags:** ${h.tags.join(', ')}\n\n`
    )).join('---\n\n');
    
    const blob = new Blob([`# Notes for ${paper.title}\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${paper.title.replace(/\s+/g, '_')}_notes.md`;
    a.click();
  };

  if (!readerId || !paper) return null;

  const isExternal = paper.is_external === 1 || !paper.upload_url;
  const pdfUrl = `http://localhost:8000/papers/${readerId}/file`;

  return (
    <div className="h-full w-full flex flex-col bg-background border-l border-border overflow-hidden relative">
      {/* Secure Shield Overlay */}
      <AnimatePresence>
        {isSecureShieldActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[300] bg-background/80 backdrop-blur-3xl flex flex-col items-center justify-center gap-6 p-12 text-center">
            <div className="p-6 rounded-full bg-primary/10 text-primary animate-pulse"><EyeOff size={48} /></div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-widest">Secure View Active</h2>
              <p className="text-sm text-muted-foreground max-w-sm">Content is protected. Return focus to the browser window to continue reading.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reader Header */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between bg-card shrink-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          {isExternal ? <FileText size={16} className="text-blue-400 shrink-0" /> : <Shield size={16} className="text-primary shrink-0" />}
          <h3 className="text-[11px] font-bold text-foreground truncate max-w-md uppercase tracking-tight">{paper.title}</h3>
          {isExternal
            ? <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[8px] font-black tracking-widest border border-blue-500/20">ABSTRACT_VIEW</span>
            : <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black tracking-widest border border-primary/20">SECURE_READER</span>
          }
        </div>
        
        <div className="flex items-center gap-1">
          {isMaximized && (
            <button 
              onClick={() => setMaximizedReaderId(null)} 
              className="p-1.5 px-3 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mr-2 shadow-lg" 
              title="Exit Fullscreen"
            >
              <Minimize2 size={14} /> Exit Fullscreen
            </button>
          )}
          <button onClick={exportNotes} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-all" title="Export Notes"><Download size={16} /></button>
          <button onClick={() => setShowSections(!showSections)} className={`p-1.5 rounded-md transition-all ${showSections ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Sections"><List size={16} /></button>
          <div className="w-px h-4 bg-border mx-1" />
          <button 
            onClick={() => isMaximized ? setMaximizedReaderId(null) : setActiveReaderId(null)} 
            className="p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-all"
            title="Close Reader"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Dynamic Watermark */}
        <div className="absolute inset-0 z-[60] pointer-events-none opacity-[0.03] overflow-hidden select-none flex flex-wrap gap-x-24 gap-y-24 rotate-[-30deg] scale-150">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="text-[10px] font-black mono whitespace-nowrap">{user?.email} // {new Date().toLocaleDateString()}</div>
          ))}
        </div>

        {/* Floating Assistant (Fullscreen Only) — isolated component so its state
            changes never cause the PDF Viewer above to re-render */}
        {isMaximized && readerId && (
          <div className="absolute bottom-20 right-8 z-[200]">
            <FloatingAssistant ref={assistantRef} paperId={readerId} />
          </div>
        )}

        {/* Intelligence Bar (Fullscreen Only) */}
        {isMaximized && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[180]">
            <div className="flex items-center gap-1 bg-card/80 backdrop-blur-xl border border-border rounded-full p-1 shadow-2xl ring-1 ring-white/5">
              <QuickAction icon={<BarChart3 size={14} />} label="Summary" onClick={() => assistantRef.current?.query("Generate a comprehensive technical summary of this paper.")} />
              <QuickAction icon={<Microscope size={14} />} label="Methods" onClick={() => assistantRef.current?.query("Extract and audit the specific methodologies and technical steps used in this research.")} />
              <QuickAction icon={<ShieldCheck size={14} />} label="Verify Claims" onClick={() => assistantRef.current?.query("Identify and verify the core scientific claims made in this paper. Are they supported by the results?")} />
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => assistantRef.current?.toggle()} className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-full transition-all">
                AI Assistant
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showSections && paper.sections && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="border-r border-border bg-card overflow-y-auto custom-scrollbar shrink-0 z-[70]">
              <div className="p-4 space-y-4">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Table of Contents</p>
                <div className="space-y-1">
                  {Object.entries(paper.sections || {}).map(([title, content]) => (
                    <button key={title} className="w-full text-left p-2 rounded-md hover:bg-accent group transition-all">
                      <h4 className="text-[10px] font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{title}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1 font-medium">{String(content)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 bg-accent/20 relative flex flex-col overflow-hidden">
          <div className="flex-1 relative secure-reader-content overflow-y-auto custom-scrollbar">
            {isExternal ? (
              <AbstractReader paper={paper} onExplain={handleExplain} />
            ) : (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <div style={{ height: '100%' }}>
                  <Viewer
                    fileUrl={pdfUrl}
                    httpHeaders={{ Authorization: `Bearer ${token}` }}
                    plugins={[defaultLayoutPluginInstance, highlightPluginInstance]}
                    theme="dark"
                  />
                </div>
              </Worker>
            )}
            <AnimatePresence>
              {(explanation || explanationLoading) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[150] w-full max-w-lg px-4">
                  <div className="bg-card border border-border rounded-xl p-5 shadow-2xl ring-1 ring-primary/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3"><Sparkles size={16} className="text-primary" /><h4 className="text-[10px] text-foreground font-black uppercase tracking-widest">Neural Insight</h4></div>
                      <button onClick={() => setExplanation(null)} className="p-1 hover:bg-accent rounded text-muted-foreground transition-colors"><X size={14} /></button>
                    </div>
                    <div className="min-h-[60px]">
                      {explanationLoading
                        ? <div className="flex items-center gap-3 py-4 text-muted-foreground"><Loader2 size={16} className="animate-spin text-primary" /><span className="text-[10px] font-bold uppercase tracking-widest">Analyzing selection...</span></div>
                        : <div className="border-l-2 border-primary/20 pl-3"><MarkdownText text={explanation || ''} /></div>
                      }
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-64 border-l border-border bg-card overflow-y-auto custom-scrollbar shrink-0 z-[70]">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between"><p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Annotations</p><div className="px-1.5 py-0.5 bg-accent rounded text-foreground text-[9px] font-black">{highlights.length}</div></div>
            <div className="space-y-3">
              {highlights.map((h, i) => (
                <div
                  key={i}
                  className={`p-3 border rounded-lg space-y-2 group transition-all ${
                    activeHighlightIndex === i
                      ? 'bg-yellow-500/10 border-yellow-500/40'
                      : 'bg-background border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] text-primary font-black uppercase tracking-widest">
                      <Bookmark size={10} /> marker {i + 1}
                      {h.position && (
                        <span className="text-[8px] text-muted-foreground font-normal normal-case tracking-normal">
                          p.{h.position.pageIndex + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {h.tags.map(tag => <span key={tag} className="px-1 py-0.5 bg-accent/50 text-[8px] mono text-muted-foreground rounded flex items-center gap-1"><Tag size={8} /> {tag}</span>)}
                      {h.position && !isExternal && (
                        <button
                          onClick={() => handleJumpToAnnotation(i)}
                          className="p-1 rounded text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Jump to highlight in PDF"
                        ><MapPin size={10} /></button>
                      )}
                      <button
                        onClick={() => { setEditingIndex(i); setEditingNote(h.note); }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit note"
                      ><Pencil size={10} /></button>
                      <button
                        onClick={() => {
                          const updated = highlights.filter((_, idx) => idx !== i);
                          setHighlights(updated);
                          saveHighlights(updated);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete annotation"
                      ><Trash2 size={10} /></button>
                    </div>
                  </div>
                  {/* Quoted selection — clicking jumps to it */}
                  <button
                    className="w-full text-left"
                    onClick={() => h.position && !isExternal && handleJumpToAnnotation(i)}
                    title={h.position && !isExternal ? "Click to jump to this highlight" : undefined}
                  >
                    <p className={`text-[10px] leading-snug italic line-clamp-3 group-hover:line-clamp-none transition-all ${
                      h.position && !isExternal ? 'text-muted-foreground hover:text-foreground cursor-pointer' : 'text-muted-foreground cursor-default'
                    }`}>
                      "{h.content}"
                    </p>
                  </button>
                  <div className="pt-2 border-t border-border">
                    {editingIndex === i ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editingNote}
                          onChange={e => setEditingNote(e.target.value)}
                          className="w-full h-16 bg-accent/20 border border-border/50 rounded p-2 text-[10px] text-foreground resize-none focus:outline-none focus:border-primary/40"
                          autoFocus
                        />
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="px-2 py-1 text-[9px] text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors"
                          >Cancel</button>
                          <button
                            onClick={() => {
                              const updated = highlights.map((item, idx) => idx === i ? { ...item, note: editingNote } : item);
                              setHighlights(updated);
                              saveHighlights(updated);
                              setEditingIndex(null);
                            }}
                            className="px-2 py-1 text-[9px] bg-primary text-primary-foreground rounded flex items-center gap-1 hover:opacity-90 transition-opacity"
                          ><Check size={9} /> Save</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-foreground font-medium bg-accent/30 p-2 rounded italic">{h.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{` @media print { .secure-reader-content { display: none !important; } } `}</style>
    </div>
  );
};

const AbstractReader = ({ paper, onExplain }: { paper: any; onExplain: (text: string) => void }) => {
  const [selectedText, setSelectedText] = useState('');

  const handleMouseUp = () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 10) setSelectedText(selection);
    else setSelectedText('');
  };

  return (
    <div className="h-full flex flex-col items-center overflow-y-auto custom-scrollbar bg-accent/10 p-6 md:p-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* External badge */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-black tracking-widest border border-blue-500/20">
            SEMANTIC SCHOLAR IMPORT
          </span>
          <span className="text-[10px] text-muted-foreground">No PDF available — abstract view</span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-semibold text-foreground leading-snug tracking-tight mb-4">
            {paper.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            {paper.authors && (
              <span className="flex items-center gap-1.5">
                <Users size={11} className="text-primary/60" />
                {paper.authors}
              </span>
            )}
            {paper.year && (
              <span className="flex items-center gap-1.5">
                <Calendar size={11} className="text-primary/60" />
                {paper.year}
              </span>
            )}
            {paper.domain && (
              <span className="flex items-center gap-1.5">
                <FileText size={11} className="text-primary/60" />
                {paper.domain}
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Abstract */}
        {paper.abstract ? (
          <div
            className="space-y-3"
            onMouseUp={handleMouseUp}
          >
            <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Abstract</h2>
            <p className="text-sm text-foreground/80 leading-relaxed selection:bg-primary/20">
              {paper.abstract}
            </p>
            {selectedText && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 pt-1"
              >
                <button
                  onClick={() => { onExplain(selectedText); setSelectedText(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-[10px] font-bold hover:opacity-90 transition-opacity"
                >
                  <Zap size={11} fill="currentColor" /> Explain selection
                </button>
                <button
                  onClick={() => setSelectedText('')}
                  className="px-3 py-1.5 border border-border rounded-md text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No abstract available for this paper.</p>
        )}

        <div className="border-t border-border/50" />

        {/* Actions */}
        <div className="space-y-3">
          <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Access Full Paper</h2>
          <div className="flex flex-wrap gap-3">
            {paper.scholar_url && (
              <a
                href={paper.scholar_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-[11px] font-semibold text-foreground hover:border-primary/40 hover:bg-accent/30 transition-all"
              >
                <ExternalLink size={13} className="text-primary" />
                View on Semantic Scholar
              </a>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            To enable full PDF reading and text highlighting, download the PDF and re-upload it to your library.
          </p>
        </div>

        {/* Concepts */}
        {paper.concepts && paper.concepts.length > 0 && (
          <>
            <div className="border-t border-border/50" />
            <div className="space-y-3">
              <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Key Concepts</h2>
              <div className="flex flex-wrap gap-2">
                {paper.concepts.map((c: any) => (
                  <span key={c.id} className="px-2.5 py-1 bg-accent/40 border border-border rounded-full text-[10px] text-foreground/70 font-medium">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Floating Assistant ───────────────────────────────────────────────────────
// Isolated component — keeps all AI state internal so state changes never
// cause the PDF Viewer in the parent to re-render and flash black.

interface AssistantHandle {
  query: (text: string) => void;
  toggle: () => void;
}

const FloatingAssistant = forwardRef<AssistantHandle, { paperId: number }>(
  ({ paperId }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    // Ref to the scrollable messages div — scroll it directly to avoid
    // scrollIntoView() propagating up and scrolling the PDF viewer
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, [messages, loading]);

    const runQuery = useCallback(async (text: string) => {
      if (!text.trim()) return;
      setMessages(prev => [...prev, { role: 'user', text }]);
      setIsExpanded(true);
      setLoading(true);
      try {
        const res = await api.queryAI(text, paperId);
        const answer = res.answer.split('FOLLOW_UP:')[0].trim();
        setMessages(prev => [...prev, { role: 'ai', text: answer }]);
      } catch {
        setMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Please try again.' }]);
      } finally {
        setLoading(false);
      }
    }, [paperId]);

    useImperativeHandle(ref, () => ({
      query: runQuery,
      toggle: () => setIsExpanded(prev => !prev),
    }), [runQuery]);

    return (
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            drag dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 h-[450px] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-3 border-b border-border bg-accent/5 flex items-center justify-between cursor-move shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">Neural Assistant</span>
              </div>
              <button onClick={() => setIsExpanded(false)} className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {messages.length === 0 && !loading && (
                <p className="text-[10px] text-muted-foreground text-center py-6 leading-relaxed">
                  Ask anything about this paper — summaries, methods, claims, comparisons.
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                    {m.role === 'user' ? 'You' : 'Neural AI'}
                  </span>
                  <div className={`max-w-[92%] px-3 py-2.5 rounded-xl ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border border-border rounded-bl-sm'
                  }`}>
                    {m.role === 'user'
                      ? <p className="text-[11px] leading-relaxed">{m.text}</p>
                      : <MarkdownText text={m.text} compact />
                    }
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start">
                  <div className="bg-card border border-border px-3 py-2.5 rounded-xl rounded-bl-sm flex items-center gap-2">
                    <Loader2 size={11} className="animate-spin text-primary" />
                    <span className="text-[10px] text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border bg-background shrink-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ask about this paper..."
                  className="w-full bg-accent/20 border border-border rounded-md py-1.5 pl-3 pr-8 text-[11px] focus:outline-none focus:border-primary/50 transition-all"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { runQuery(input); setInput(''); } }}
                />
                <button
                  onClick={() => { if (input.trim()) { runQuery(input); setInput(''); } }}
                  className="absolute right-1.5 p-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsExpanded(true)}
            className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center shadow-2xl hover:opacity-90 transition-all border-4 border-background"
          >
            <Sparkles size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    );
  }
);

const QuickAction = ({ icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 hover:bg-foreground/5 rounded-full text-muted-foreground hover:text-foreground transition-all group">
    <div className="group-hover:scale-110 transition-transform">{icon}</div>
    <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
  </button>
);

export default PaperReader;
