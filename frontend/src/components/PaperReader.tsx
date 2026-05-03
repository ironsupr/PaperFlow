import React, { useState, useEffect, useMemo } from 'react';
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { highlightPlugin, RenderHighlightTargetProps } from '@react-pdf-viewer/highlight';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import { useStore } from '../store/useStore';
import { X, Save, MessageSquare, List, Zap, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';

const PaperReader = () => {
  const { activeReaderId, setActiveReaderId, papers, fetchPapers, token } = useStore();
  const paper = papers.find(p => p.id === activeReaderId);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [showSections, setShowSections] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  // Define plugin instances at the top level to follow Rules of Hooks
  const renderHighlightTarget = (props: RenderHighlightTargetProps) => (
    <div
      className="absolute z-50 flex items-center gap-1 bg-slate-900 border border-blue-500/50 rounded-lg shadow-2xl p-1 animate-in zoom-in-95"
      style={{
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
      }}
    >
      <button
        className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-blue-600 rounded-md transition-colors"
        onClick={() => {
          const note = window.prompt("Add a note to this highlight:");
          if (note !== null) {
            const newHighlight = {
              content: props.selectedText,
              note: note,
              position: props.selectionRegion,
            };
            const updated = [...highlights, newHighlight];
            setHighlights(updated);
            saveHighlights(updated);
          }
        }}
      >
        <Save size={12} /> Highlight
      </button>
      <div className="w-px h-4 bg-white/10" />
      <button
        className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-blue-400 hover:bg-blue-600/20 rounded-md transition-colors"
        onClick={() => handleExplain(props.selectedText)}
      >
        <Zap size={12} fill="currentColor" /> Explain This
      </button>
    </div>
  );

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget,
  });

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    if (paper) {
      setHighlights(paper.highlights || []);
    } else {
      setHighlights([]);
    }
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

  const saveHighlights = async (updated: any[]) => {
    if (!activeReaderId) return;
    try {
      await api.updateHighlights(activeReaderId, updated);
      await fetchPapers();
    } catch (error) {
      console.error('Failed to save highlights:', error);
    }
  };

  // Early return after hooks
  if (!activeReaderId || !paper) return null;

  const pdfUrl = `http://localhost:8000/papers/${activeReaderId}/file`;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-4 z-[100] bg-slate-900 border border-white/10 rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
    >
      {/* Reader Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-600/20 rounded-xl text-blue-400">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm truncate max-w-md">{paper.title}</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Reader Core v1.0</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSections(!showSections)}
            className={`p-2 rounded-xl transition-all ${showSections ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
            title="Sections"
          >
            <List size={18} />
          </button>
          <button 
            onClick={() => setActiveReaderId(null)}
            className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Section Navigation Sidebar */}
        <AnimatePresence>
          {showSections && paper.sections && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-white/5 bg-slate-950/20 overflow-y-auto custom-scrollbar"
            >
              <div className="p-6 space-y-6">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Smart Navigation</p>
                <div className="space-y-2">
                  {Object.entries(paper.sections).map(([title, content]: [string, any]) => (
                    <button 
                      key={title}
                      className="w-full text-left p-3 rounded-xl hover:bg-white/5 group transition-all"
                    >
                      <h4 className="text-xs font-bold text-slate-300 group-hover:text-blue-400 transition-colors">{title}</h4>
                      <p className="text-[10px] text-slate-600 line-clamp-2 mt-1">{content}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF Viewer */}
        <div className="flex-1 bg-slate-800/50 relative">
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
              >
                <div className="bg-slate-900/90 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-blue-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                        <Sparkles size={16} className="text-white" />
                      </div>
                      <h4 className="text-white font-bold text-xs uppercase tracking-widest">AI Intelligence Response</h4>
                    </div>
                    <button 
                      onClick={() => setExplanation(null)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="min-h-[60px]">
                    {explanationLoading ? (
                      <div className="flex items-center gap-3 text-blue-400 py-4">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">Consulting Knowledge Base...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-200 leading-relaxed italic">
                        {explanation}
                      </p>
                    )}
                  </div>
                  
                  {!explanationLoading && (
                    <div className="mt-6 flex justify-end">
                      <button 
                        onClick={() => setExplanation(null)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full transition-all shadow-lg active:scale-95"
                      >
                        Acknowledge
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Highlights & Notes Sidebar */}
        <div className="w-80 border-l border-white/5 bg-slate-950/20 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Notes ({highlights.length})</p>
          <div className="space-y-4">
            {highlights.map((h, i) => (
              <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2 group">
                <div className="flex items-center gap-2 text-[10px] text-blue-400 font-bold uppercase">
                  <MessageSquare size={10} /> Note #{i + 1}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">"{h.content}"</p>
                <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 italic">
                  {h.note}
                </div>
              </div>
            ))}
            {highlights.length === 0 && (
              <div className="py-20 text-center">
                <MessageSquare size={32} className="text-slate-800 mx-auto mb-4" />
                <p className="text-xs text-slate-600">Select text in the PDF to add highlights and notes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PaperReader;
