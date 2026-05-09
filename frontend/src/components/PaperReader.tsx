import { useState, useEffect, useCallback } from 'react';
import { Worker, Viewer, RotateDirection } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { highlightPlugin } from '@react-pdf-viewer/highlight';
import type { RenderHighlightTargetProps } from '@react-pdf-viewer/highlight';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import { useStore } from '../store/useStore';
import {
  X, Save, List, Zap, Sparkles, Loader2, Bookmark,
  Tag, Download, Shield, EyeOff, Minimize2, Send,
  BarChart3, ShieldCheck, Microscope, Pencil, Trash2, Check
} from 'lucide-react';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  const [highlights, setHighlights] = useState<Array<{ content: string; note: string; tags: string[]; position: unknown }>>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingNote, setEditingNote] = useState('');
  const [showSections, setShowSections] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  // Secure Reader State
  const [isSecureShieldActive, setIsSecureShieldActive] = useState(false);

  // Fullscreen AI State
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: 'user' | 'ai', text: string }>>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

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

  const handleAssistantQuery = async (overrideQuery?: string) => {
    const queryText = overrideQuery || assistantInput;
    if (!queryText.trim() || !readerId) return;

    if (!overrideQuery) {
      setAssistantMessages(prev => [...prev, { role: 'user', text: queryText }]);
      setAssistantInput('');
    }
    
    setIsAssistantLoading(true);
    setIsAssistantExpanded(true);
    
    try {
      const res = await api.queryAI(queryText, readerId);
      const answer = res.answer.split('FOLLOW_UP:')[0].trim();
      setAssistantMessages(prev => [...prev, { role: 'ai', text: answer }]);
    } catch (error) {
      console.error('Assistant error:', error);
    } finally {
      setIsAssistantLoading(false);
    }
  };

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
            };
            const updated = [...highlights, newHighlight];
            setHighlights(updated);
            saveHighlights(updated);
            
            api.createNote(readerId!, {
              content: note,
              tags: tags,
              position_data: props.selectionRegion
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
            onClick={() => handleAssistantQuery(`Critically analyze this selection: "${props.selectedText}"`)}
          >
            <Microscope size={12} /> Critique
          </button>
        </>
      )}
    </div>
  );

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget,
  });

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
          <Shield size={16} className="text-primary shrink-0" />
          <h3 className="text-[11px] font-bold text-foreground truncate max-w-md uppercase tracking-tight">{paper.title}</h3>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black tracking-widest border border-primary/20">SECURE_READER</span>
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

        {/* Floating Assistant (Fullscreen Only) */}
        {isMaximized && (
          <div className="absolute bottom-20 right-8 z-[200]">
            <AnimatePresence>
              {isAssistantExpanded ? (
                <motion.div 
                  drag
                  dragMomentum={false}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="w-80 h-[450px] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
                >
                  <div className="p-3 border-b border-border bg-accent/5 flex items-center justify-between cursor-move">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Neural Assistant</span>
                    </div>
                    <button onClick={() => setIsAssistantExpanded(false)} className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {assistantMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] p-2.5 rounded-lg text-[11px] leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground font-medium' : 'bg-accent/20 border border-border text-foreground/90'}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {isAssistantLoading && (
                      <div className="flex justify-start">
                        <div className="bg-accent/20 border border-border p-2 rounded-lg"><Loader2 size={12} className="animate-spin text-muted-foreground" /></div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-border bg-background">
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        placeholder="Ask about this paper..."
                        className="w-full bg-accent/20 border border-border rounded-md py-1.5 pl-3 pr-8 text-[11px] focus:outline-none focus:border-primary/50 transition-all"
                        value={assistantInput}
                        onChange={e => setAssistantInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAssistantQuery()}
                      />
                      <button 
                        onClick={() => handleAssistantQuery()}
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
                  onClick={() => setIsAssistantExpanded(true)}
                  className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center shadow-2xl hover:opacity-90 transition-all border-4 border-background"
                >
                  <Sparkles size={24} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Intelligence Bar (Fullscreen Only) */}
        {isMaximized && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[180]">
            <div className="flex items-center gap-1 bg-card/80 backdrop-blur-xl border border-border rounded-full p-1 shadow-2xl ring-1 ring-white/5">
              <QuickAction icon={<BarChart3 size={14} />} label="Summary" onClick={() => handleAssistantQuery("Generate a comprehensive technical summary of this paper.")} />
              <QuickAction icon={<Microscope size={14} />} label="Methods" onClick={() => handleAssistantQuery("Extract and audit the specific methodologies and technical steps used in this research.")} />
              <QuickAction icon={<ShieldCheck size={14} />} label="Verify Claims" onClick={() => handleAssistantQuery("Identify and verify the core scientific claims made in this paper. Are they supported by the results?")} />
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => setIsAssistantExpanded(!isAssistantExpanded)} className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-full transition-all">
                {isAssistantExpanded ? 'Hide AI' : 'Show AI'}
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
            <AnimatePresence>
              {(explanation || explanationLoading) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[150] w-full max-w-lg px-4">
                  <div className="bg-card border border-border rounded-xl p-5 shadow-2xl ring-1 ring-primary/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3"><Sparkles size={16} className="text-primary" /><h4 className="text-[10px] text-foreground font-black uppercase tracking-widest">Neural Insight</h4></div>
                      <button onClick={() => setExplanation(null)} className="p-1 hover:bg-accent rounded text-muted-foreground transition-colors"><X size={14} /></button>
                    </div>
                    <div className="min-h-[60px]">{explanationLoading ? <div className="flex items-center gap-3 py-4 text-muted-foreground"><Loader2 size={16} className="animate-spin text-primary" /><span className="text-[10px] font-bold uppercase tracking-widest">Analyzing selection...</span></div> : <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l border-primary/20 pl-3">{explanation}</p>}</div>
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
                <div key={i} className="p-3 bg-background border border-border rounded-lg space-y-2 group hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] text-primary font-black uppercase tracking-widest"><Bookmark size={10} /> marker {i + 1}</div>
                    <div className="flex items-center gap-1">
                      {h.tags.map(tag => <span key={tag} className="px-1 py-0.5 bg-accent/50 text-[8px] mono text-muted-foreground rounded flex items-center gap-1"><Tag size={8} /> {tag}</span>)}
                      <button
                        onClick={() => { setEditingIndex(i); setEditingNote(h.note); }}
                        className="ml-1 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
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
                  <p className="text-[10px] text-muted-foreground leading-snug italic line-clamp-3 group-hover:line-clamp-none transition-all">"{h.content}"</p>
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

const QuickAction = ({ icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 hover:bg-foreground/5 rounded-full text-muted-foreground hover:text-foreground transition-all group">
    <div className="group-hover:scale-110 transition-transform">{icon}</div>
    <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
  </button>
);

export default PaperReader;
