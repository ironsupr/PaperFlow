import React, { useRef } from 'react';
import { Search, Upload, GitBranch, Zap, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../api/client';

const BottomHUD = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setIsProcessing, fetchPapers } = useStore();

  const onUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const paper = await api.uploadPaper(file);
        console.log('Uploaded paper:', paper);
        await fetchPapers();
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-4 rounded-3xl flex items-center gap-6 shadow-2xl">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input 
          type="text" 
          placeholder="Search papers, DOIs, or concepts..." 
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
        />
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onUploadClick}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
        >
          <Upload size={18} /> Upload PDF
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf"
          onChange={onFileChange}
        />
      </div>

      <div className="h-10 w-px bg-white/10 mx-2" />

      <div className="flex items-center gap-4">
        <HUDAction icon={<Zap size={18} />} label="Deepen" />
        <HUDAction icon={<GitBranch size={18} />} label="Connect" />
        <HUDAction icon={<FileText size={18} />} label="Insight" />
      </div>
    </div>
  );
};

const HUDAction = ({ icon, label }: { icon: any; label: string }) => (
  <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors group">
    <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
      {icon}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

export default BottomHUD;
