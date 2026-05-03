import { useState, useEffect } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { highlightPlugin } from '@react-pdf-viewer/highlight';
import type { RenderHighlightTargetProps } from '@react-pdf-viewer/highlight';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import { useStore } from '../store/useStore';
import { X, Save, MessageSquare, List, Zap, Sparkles, Loader2, FileText, Bookmark, Tag, Download } from 'lucide-react';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';

const PaperReader = () => {
  const { activeReaderId, setActiveReaderId, papers, fetchPapers, token } = useStore();
  const paper = papers.find(p => p.id === activeReaderId);
  
  const [highlights, setHighlights] = useState<Array<{ content: string; note: string; tags: string[]; position: unknown }>>([]);
  const [showSections, setShowSections] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const renderHighlightTarget = (props: RenderHighlightTargetProps) => (
    <div
      className="absolute z-50 flex items-center gap-1 bg-card border border-border rounded-md shadow-xl p-1 animate-in zoom-in-95"
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
            
            // Also save as formal Note
            api.createNote(activeReaderId!, {
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
    </div>
  );

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget,
  });

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    // Cast highlights from paper to match our expected format with tags
    const paperHighlights = (paper?.highlights || []).map((h: any) => ({
      ...h,
      tags: h.tags || []
    }));
    setHighlights(paperHighlights);
  }, [paper]);


  const handleExplain = async (text: string) => {
    if (!activeReaderId) return;
    setExplanationLoading(true);
    try {
      const res = await api.explainText(text, activeReaderId);
      setExplanation(res.explanation);
    } catch (error) {
      console.error('Explanation failed:', error);
    } finally {
      setExplanationLoading(false);
    }
  };

  const saveHighlights = async (updated: Array<{ content: string; note: string; tags: string[]; position: unknown }>) => {
    if (!activeReaderId) return;
    try {
      await api.updateHighlights(activeReaderId, updated);
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

  if (!activeReaderId || !paper) return null;

  const pdfUrl = `http://localhost:8000/papers/${activeReaderId}/file`;

  return (
    <div className="h-full w-full flex flex-col bg-background border-l border-border select-none overflow-hidden">
      {/* Reader Header */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={16} className="text-primary shrink-0" />
          <h3 className="text-[11px] font-bold text-foreground truncate max-w-md uppercase tracking-tight">{paper.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={exportNotes}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-all"
            title="Export Notes"
          >
            <Download size={16} />
          </button>
          <button 
            onClick={() => setShowSections(!showSections)}
            className={`p-1.5 rounded-md transition-all ${showSections ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            title="Sections"
          >
            <List size={16} />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button 
            onClick={() => setActiveReaderId(null)}
            className="p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Section Navigation Sidebar */}
        <AnimatePresence>
          {showSections && paper.sections && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-border bg-card overflow-y-auto custom-scrollbar shrink-0"
            >
              <div className="p-4 space-y-4">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Table of Contents</p>
                <div className="space-y-1">
                  {Object.entries(paper.sections || {}).map(([title, content]) => (
                    <button 
                      key={title}
                      className="w-full text-left p-2 rounded-md hover:bg-accent group transition-all"
                    >
                      <h4 className="text-[10px] font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{title}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1 font-medium">{String(content)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF Viewer */}
        <div className="flex-1 bg-accent/20 relative flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
              <Viewer
                fileUrl={pdfUrl}
                httpHeaders={{ Authorization: `Bearer ${token}` }}
                plugins={[defaultLayoutPluginInstance, highlightPluginInstance]}
                theme="dark"
              />
            </Worker>

            {/* AI Explanation Overlay */}
            <AnimatePresence>
              {(explanation || explanationLoading) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
                >
                  <div className="bg-card border border-border rounded-xl p-5 shadow-2xl ring-1 ring-primary/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Sparkles size={16} className="text-primary" />
                        <h4 className="text-[10px] text-foreground font-black uppercase tracking-widest">Neural Insight</h4>
                      </div>
                      <button 
                        onClick={() => setExplanation(null)}
                        className="p-1 hover:bg-accent rounded text-muted-foreground transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div className="min-h-[60px]">
                      {explanationLoading ? (
                        <div className="flex items-center gap-3 py-4 text-muted-foreground">
                          <Loader2 size={16} className="animate-spin text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Analyzing selection...</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l border-primary/20 pl-3">
                          {explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Highlights Sidebar */}
        <div className="w-64 border-l border-border bg-card overflow-y-auto custom-scrollbar shrink-0">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Annotations</p>
              <div className="px-1.5 py-0.5 bg-accent rounded text-foreground text-[9px] font-black">{highlights.length}</div>
            </div>
            
            <div className="space-y-3">
              {highlights.map((h, i) => (
                <div key={i} className="p-3 bg-background border border-border rounded-lg space-y-2 group hover:border-primary/30 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] text-primary font-black uppercase tracking-widest">
                      <Bookmark size={10} /> marker {i + 1}
                    </div>
                    <div className="flex gap-1">
                      {h.tags.map(tag => (
                        <span key={tag} className="px-1 py-0.5 bg-accent/50 text-[8px] mono text-muted-foreground rounded flex items-center gap-1">
                          <Tag size={8} /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug italic line-clamp-3 group-hover:line-clamp-none transition-all">"{h.content}"</p>
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] text-foreground font-medium bg-accent/30 p-2 rounded italic">
                      {h.note}
                    </p>
                  </div>
                </div>
              ))}
              {highlights.length === 0 && (
                <div className="py-20 text-center opacity-20 flex flex-col items-center gap-3">
                  <MessageSquare size={24} className="text-muted-foreground" />
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">No Annotations</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperReader;
