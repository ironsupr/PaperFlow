import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Shield, EyeOff, FileText, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Worker, Viewer, RotateDirection } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { useState, useCallback, useEffect } from 'react';

interface FloatingReaderProps {
  paperId: number;
  onClose: () => void;
}

const FloatingReader = ({ paperId, onClose }: FloatingReaderProps) => {
  const { papers, token, user, setMaximizedReaderId } = useStore();
  const paper = papers.find(p => p.id === paperId);
  const [isSecureShieldActive, setIsSecureShieldActive] = useState(false);

  const handleSecurityTrigger = useCallback(() => setIsSecureShieldActive(true), []);
  const clearSecurityTrigger = useCallback(() => setIsSecureShieldActive(false), []);

  useEffect(() => {
    window.addEventListener('blur', handleSecurityTrigger);
    window.addEventListener('focus', clearSecurityTrigger);
    return () => {
      window.removeEventListener('blur', handleSecurityTrigger);
      window.removeEventListener('focus', clearSecurityTrigger);
    };
  }, [handleSecurityTrigger, clearSecurityTrigger]);

  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [],
    renderToolbar: (Toolbar) => (
      <Toolbar>
        {(props) => {
          const { CurrentScale, ZoomIn, ZoomOut, Rotate, GoToNextPage, GoToPreviousPage } = props;
          return (
            <div className="flex items-center justify-between w-full px-2 py-1 bg-card border-b border-border">
              <div className="flex items-center gap-1 scale-75">
                <GoToPreviousPage />
                <GoToNextPage />
              </div>
              <div className="flex items-center gap-1 scale-75">
                <ZoomOut />
                <CurrentScale />
                <ZoomIn />
              </div>
              <div className="flex items-center gap-1 scale-75">
                <Rotate direction={RotateDirection.Forward} />
              </div>
            </div>
          );
        }}
      </Toolbar>
    ),
  });

  if (!paper) return null;
  const isExternal = paper.is_external === 1 || !paper.upload_url;
  const pdfUrl = `http://localhost:8000/papers/${paperId}/file`;

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, x: 100, y: 100 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed z-[150] w-[500px] h-[650px] bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans"
    >
      {/* Secure Shield */}
      <AnimatePresence>
        {isSecureShieldActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[200] bg-background/60 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
            <EyeOff size={32} className="text-primary mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">Secure Shield</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="h-10 px-3 bg-card border-b border-border flex items-center justify-between cursor-move handle">
        <div className="flex items-center gap-2 min-w-0">
          {isExternal ? <FileText size={14} className="text-blue-400 shrink-0" /> : <Shield size={14} className="text-primary shrink-0" />}
          <span className="text-[10px] font-bold truncate uppercase tracking-tight text-foreground/70">{paper.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMaximizedReaderId(paperId)} className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground">
            <Maximize2 size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-red-500/20 rounded transition-colors text-muted-foreground hover:text-red-400">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-accent/5 overflow-hidden">
        {/* Watermark */}
        <div className="absolute inset-0 z-[60] pointer-events-none opacity-[0.02] overflow-hidden select-none flex flex-wrap gap-12 rotate-[-30deg]">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="text-[8px] font-black mono whitespace-nowrap">{user?.email}</div>
          ))}
        </div>

        {isExternal ? (
          <div className="h-full overflow-y-auto custom-scrollbar p-5 space-y-4">
            <div>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-black tracking-widest border border-blue-500/20">
                SEMANTIC SCHOLAR IMPORT
              </span>
            </div>
            <h2 className="text-sm font-semibold text-foreground leading-snug">{paper.title}</h2>
            {paper.authors && <p className="text-[11px] text-muted-foreground">{paper.authors}{paper.year ? ` · ${paper.year}` : ''}</p>}
            <div className="border-t border-border/50" />
            {paper.abstract ? (
              <div className="space-y-2">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Abstract</p>
                <p className="text-[11px] text-foreground/80 leading-relaxed">{paper.abstract}</p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">No abstract available.</p>
            )}
            {paper.scholar_url && (
              <a
                href={paper.scholar_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-[11px] font-medium text-foreground hover:border-primary/40 transition-colors"
              >
                <ExternalLink size={12} className="text-primary" />
                View on Semantic Scholar
              </a>
            )}
          </div>
        ) : (
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
            <Viewer
              fileUrl={pdfUrl}
              httpHeaders={{ Authorization: `Bearer ${token}` }}
              plugins={[defaultLayoutPluginInstance]}
              theme="dark"
            />
          </Worker>
        )}
      </div>
      
      <style>{`
        .secure-reader-content { user-select: none; }
        @media print { .secure-reader-content { display: none !important; } }
      `}</style>
    </motion.div>
  );
};

export default FloatingReader;
