import React, { useRef } from 'react';
import { Search, Upload, GitBranch, Zap, FileText, Loader2, Cpu } from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';

const BottomHUD = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isProcessing, setIsProcessing, fetchPapers } = useStore();

  const onUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        await api.uploadPaper(file);
        await fetchPapers();
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="relative group">
      {/* Background Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative bg-slate-900/60 backdrop-blur-3xl border border-white/10 p-2.5 pl-6 rounded-[2.5rem] flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Search Section */}
        <div className="flex-1 relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search papers, concepts, or cross-references..." 
            className="w-full bg-transparent border-none py-3 pl-8 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-0 transition-colors"
          />
        </div>

        {/* Status / Processing Indicator */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full"
            >
              <Loader2 size={12} className="text-blue-400 animate-spin" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Parsing PDF</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-8 w-px bg-white/5" />

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <HUDAction icon={<Zap size={16} />} label="Analyze" />
          <HUDAction icon={<GitBranch size={16} />} label="Map" />
          <HUDAction icon={<Cpu size={16} />} label="AI Core" active />
        </div>

        {/* Upload Button */}
        <div className="ml-2">
          <button 
            onClick={onUploadClick}
            disabled={isProcessing}
            className="relative group/btn flex items-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 px-6 py-3.5 rounded-[1.8rem] text-sm font-bold text-white transition-all shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_30px_rgba(37,99,235,0.4)] active:scale-95"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            <span>{isProcessing ? 'Processing...' : 'Upload Paper'}</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf"
            onChange={onFileChange}
          />
        </div>
      </div>
    </div>
  );
};

const HUDAction = ({ icon, label, active }: { icon: any; label: string; active?: boolean }) => (
  <button className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all group/item ${active ? 'bg-white/5' : 'hover:bg-white/5'}`}>
    <div className={`p-1 transition-colors ${active ? 'text-blue-400' : 'text-slate-500 group-hover/item:text-slate-300'}`}>
      {icon}
    </div>
    <span className={`text-[8px] font-bold uppercase tracking-[0.2em] ${active ? 'text-blue-500' : 'text-slate-600 group-hover/item:text-slate-400'}`}>
      {label}
    </span>
  </button>
);

export default BottomHUD;
