import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Sparkles, BookOpen, Search, Shield, Zap, MessageSquare, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';

const RightPanel = () => {
  const { role, selectedPaperId } = useStore();
  const [query, setQuery] = useState('');
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.queryAI(query, selectedPaperId || undefined);
      setResponses([...responses, { query, answer: res.answer }]);
      setQuery('');
    } catch (error) {
      console.error('AI query failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRoleSpecificContent = () => {
    switch (role) {
      case 'student':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="flex items-center gap-2 text-blue-400 font-semibold mb-1">
                <BookOpen size={16} /> Concept Summary
              </h4>
              <p className="text-sm text-gray-300">
                This paper introduces the fundamental principles of qubit coherence times...
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <h4 className="flex items-center gap-2 text-purple-400 font-semibold mb-1">
                <Zap size={16} /> 2-Person Podcast
              </h4>
              <button className="w-full mt-2 py-2 bg-purple-600 hover:bg-purple-700 rounded text-xs font-bold transition-colors">
                Generate Audio Explanation
              </button>
            </div>
          </div>
        );
      case 'researcher':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <h4 className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <Search size={16} /> Gap Detection
              </h4>
              <p className="text-sm text-gray-300">
                Identified a research gap in error correction for superconducting circuits...
              </p>
            </div>
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <h4 className="flex items-center gap-2 text-orange-400 font-semibold mb-1">
                <Sparkles size={16} /> Novelty Score
              </h4>
              <div className="flex items-center gap-4 mt-2">
                <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 w-[75%]" />
                </div>
                <span className="text-xs font-bold">75%</span>
              </div>
            </div>
          </div>
        );
      case 'reviewer':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <h4 className="flex items-center gap-2 text-red-400 font-semibold mb-1">
                <Shield size={16} /> Flaw Detection
              </h4>
              <ul className="text-xs text-gray-300 list-disc ml-4 space-y-1">
                <li>Logical gap in Theorem 3.2</li>
                <li>Missing citation for "Surface Codes"</li>
              </ul>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <h4 className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
                <MessageSquare size={16} /> Review Report
              </h4>
              <button className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-bold transition-colors">
                Generate Official Report
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Sparkles className="text-yellow-400" size={18} /> Research Intelligence
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
          {role}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {responses.map((res, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-2 text-xs max-w-[80%]">
                {res.query}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs max-w-[90%] text-gray-200">
                {res.answer}
              </div>
            </div>
          </div>
        ))}

        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderRoleSpecificContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-4 bg-white/5 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            placeholder={`Ask about this paper...`}
            className="w-full bg-slate-800 border border-white/10 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            disabled={loading}
          />
          <button 
            onClick={handleQuery}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
