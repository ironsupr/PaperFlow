import React, { useRef } from 'react';
import { 
  Home, GraduationCap, Microscope, ShieldCheck, Globe, Bookmark, 
  Upload, ChevronRight, LayoutGrid, Plus, LogOut, Settings, Trash2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../api/client';
import { motion } from 'framer-motion';

const LeftSidebar = () => {
  const { role, setRole, logout, setIsProcessing, fetchPapers } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleClearWorkspace = async () => {
    if (window.confirm("Are you sure you want to clear your entire workspace? This will delete all papers and citations permanently.")) {
      try {
        await api.clearWorkspace();
        useStore.getState().clearStore(); // Clear local state immediately
      } catch (error) {
        console.error('Failed to clear workspace:', error);
      }
    }
  };

  return (
    <div className="h-full w-full bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl">
      {/* Brand Section */}
      <div className="p-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <span className="text-white font-black text-xl italic tracking-tighter">PF</span>
          </div>
          <div>
            <h1 className="text-white font-black text-sm uppercase tracking-widest leading-none">PaperFlow</h1>
            <p className="text-[9px] text-blue-500 font-bold mt-1 uppercase tracking-widest">Quantum v2.0</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
        {/* Navigation Layer */}
        <section className="space-y-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] px-4 mb-4">Navigation Layer</p>
          <SidebarItem icon={<Home size={18} />} label="Home" active />
          <SidebarItem icon={<Globe size={18} />} label="Explore Papers" />
          <SidebarItem icon={<Bookmark size={18} />} label="Saved Notes" />
        </section>

        {/* Intelligence Modes */}
        <section className="space-y-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] px-4 mb-4">System Modes</p>
          <SidebarItem 
            icon={<GraduationCap size={18} />} 
            label="Student Mode" 
            active={role === 'student'} 
            onClick={() => setRole('student')}
          />
          <SidebarItem 
            icon={<Microscope size={18} />} 
            label="Researcher Mode" 
            active={role === 'researcher'} 
            onClick={() => setRole('researcher')}
          />
          <SidebarItem 
            icon={<ShieldCheck size={18} />} 
            label="Reviewer Mode" 
            active={role === 'reviewer'} 
            onClick={() => setRole('reviewer')}
          />
        </section>

        {/* Danger Zone */}
        <section className="space-y-2 pt-4">
          <p className="text-[10px] text-red-500/50 font-bold uppercase tracking-[0.2em] px-4 mb-4">Danger Zone</p>
          <SidebarItem 
            icon={<Trash2 size={18} />} 
            label="Clear Workspace" 
            onClick={handleClearWorkspace}
            danger
          />
        </section>
      </div>

      {/* Primary Action & Footer */}
      <div className="p-6 space-y-4">
        <button 
          onClick={onUploadClick}
          className="w-full group flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 py-4 rounded-[1.5rem] text-sm font-bold text-white transition-all shadow-lg active:scale-[0.98]"
        >
          <div className="p-1.5 bg-white/20 rounded-lg group-hover:rotate-90 transition-transform duration-300">
            <Plus size={16} />
          </div>
          Upload Paper
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf"
          onChange={onFileChange}
        />

        <div className="h-px bg-white/5 mx-2" />

        <div className="flex items-center justify-between px-2">
          <button onClick={() => logout()} className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Logout">
            <LogOut size={18} />
          </button>
          <button className="p-2 text-slate-500 hover:text-white transition-colors" title="Settings">
            <Settings size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border border-white/20 shadow-inner" />
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
    className={`w-full group flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${
      active 
        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
        : danger
          ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
    }`}
  >
    <div className={`transition-transform duration-300 group-hover:scale-110 ${
      active ? 'text-blue-400' : danger ? 'text-slate-600 group-hover:text-red-400' : 'text-slate-500 group-hover:text-blue-300'
    }`}>
      {icon}
    </div>
    <span className="flex-1 text-left text-xs font-bold tracking-tight">{label}</span>
    {active && (
      <motion.div layoutId="sidebar-active" className="w-1 h-4 bg-blue-500 rounded-full" />
    )}
  </button>
);

export default LeftSidebar;
