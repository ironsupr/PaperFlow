import { useEffect } from 'react';
import GraphView from './GraphView';
import RightPanel from './RightPanel';
import BottomHUD from './BottomHUD';
import { useStore } from '../store/useStore';

const Workspace = () => {
  const { role, fetchPapers } = useStore();

  useEffect(() => {
    fetchPapers();
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Background Graph Layer */}
      <div className="absolute inset-0 z-0">
        <GraphView />
      </div>

      {/* Top Navigation / Flow Indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-max bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full flex items-center gap-8 text-sm font-medium">
        <span className="text-blue-400">Explore</span>
        <span className="text-gray-400 opacity-50">→</span>
        <span className="text-white">Understand</span>
        <span className="text-gray-400 opacity-50">→</span>
        <span className="text-white">Create</span>
        <span className="text-gray-400 opacity-50">→</span>
        <span className="text-white">Evaluate</span>
      </div>

      {/* Right Intelligence Panel */}
      <div className="absolute top-4 right-4 bottom-24 z-20 w-96">
        <RightPanel />
      </div>

      {/* Bottom Action HUD */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-3/4 max-w-4xl">
        <BottomHUD />
      </div>

      {/* Role Indicator / Switcher & Logout */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2 rounded-lg">
          <select 
            className="bg-transparent text-sm focus:outline-none"
            value={role}
            onChange={(e) => useStore.getState().setRole(e.target.value as any)}
          >
            <option value="student">🎓 Student Mode</option>
            <option value="researcher">🔬 Researcher Mode</option>
            <option value="reviewer">🧑‍⚖️ Reviewer Mode</option>
          </select>
        </div>
        <button 
          onClick={() => useStore.getState().logout()}
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Workspace;
