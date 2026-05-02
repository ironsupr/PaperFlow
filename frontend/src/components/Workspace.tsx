import { useEffect } from 'react';
import GraphView from './GraphView';
import RightPanel from './RightPanel';
import BottomHUD from './BottomHUD';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';

const Workspace = () => {
  const { role, fetchPapers } = useStore();

  useEffect(() => {
    fetchPapers();
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0f172a]">
      {/* Background Graph Layer */}
      <div className="absolute inset-0 z-0">
        <GraphView />
      </div>

      {/* Top Header Navigation */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-slate-900/40 backdrop-blur-xl border border-white/10 px-8 py-3 rounded-2xl flex items-center gap-10 shadow-2xl"
        >
          <NavStep label="Explore" active />
          <div className="w-1 h-1 bg-slate-700 rounded-full" />
          <NavStep label="Understand" />
          <div className="w-1 h-1 bg-slate-700 rounded-full" />
          <NavStep label="Synthesize" />
          <div className="w-1 h-1 bg-slate-700 rounded-full" />
          <NavStep label="Evaluate" />
        </motion.div>
      </div>

      {/* Sidebar Intelligence Panel */}
      <div className="absolute top-6 right-6 bottom-32 z-20 w-[420px]">
        <RightPanel />
      </div>

      {/* Bottom Command HUD */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-full max-w-5xl px-6">
        <BottomHUD />
      </div>

      {/* System Status & Role */}
      <div className="absolute top-8 left-8 z-20 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <span className="text-white font-black text-xl italic tracking-tighter">PF</span>
          </div>
          <div>
            <h1 className="text-white font-black text-sm uppercase tracking-widest leading-none">PaperFlow</h1>
            <p className="text-[10px] text-blue-500 font-bold mt-1 uppercase tracking-widest">v2.0 Quantum</p>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-1.5 rounded-[1.2rem] flex items-center gap-2 shadow-xl">
          <select 
            className="bg-transparent text-[11px] font-bold text-slate-300 uppercase tracking-widest px-3 py-1.5 focus:outline-none cursor-pointer hover:text-white transition-colors"
            value={role}
            onChange={(e) => useStore.getState().setRole(e.target.value as any)}
          >
            <option value="student">🎓 Student Mode</option>
            <option value="researcher">🔬 Researcher Mode</option>
            <option value="reviewer">🧑‍⚖️ Reviewer Mode</option>
          </select>
          <div className="w-px h-4 bg-white/10" />
          <button 
            onClick={() => useStore.getState().logout()}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
            title="System Logout"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const NavStep = ({ label, active }: { label: string; active?: boolean }) => (
  <span className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${active ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-slate-600 hover:text-slate-400 cursor-pointer'}`}>
    {label}
  </span>
);

export default Workspace;
