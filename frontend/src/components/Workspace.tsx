import { useEffect } from 'react';
import GraphView from './GraphView';
import RightPanel from './RightPanel';
import LeftSidebar from './LeftSidebar';
import BottomHUD from './BottomHUD';
import PaperReader from './PaperReader';
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

      {/* Top Header Navigation Layer Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
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

      {/* Left Navigation Sidebar */}
      <div className="absolute top-6 left-6 bottom-32 z-20 w-[280px]">
        <LeftSidebar />
      </div>

      {/* Right Intelligence Panel */}
      <div className="absolute top-6 right-6 bottom-32 z-20 w-[420px]">
        <RightPanel />
      </div>

      {/* Bottom Command HUD */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl">
        <BottomHUD />
      </div>

      {/* Full-Screen Paper Reader Overlay */}
      <PaperReader />
    </div>
  );
};

const NavStep = ({ label, active }: { label: string; active?: boolean }) => (
  <span className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${active ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-slate-600'}`}>
    {label}
  </span>
);

export default Workspace;
