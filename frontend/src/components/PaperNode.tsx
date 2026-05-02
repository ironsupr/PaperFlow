import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { FileText, ExternalLink, User, BookOpen } from 'lucide-react';

const PaperNode = ({ data, selected }: any) => {
  const isExternal = data.isExternal;

  return (
    <div className={`px-4 py-3 shadow-2xl rounded-xl border-2 transition-all duration-300 min-w-[220px] max-w-[280px]
      ${selected 
        ? 'bg-blue-600/20 border-blue-400 shadow-blue-500/20 scale-105' 
        : 'bg-slate-900/80 backdrop-blur-xl border-white/10 hover:border-blue-500/40'}
      ${isExternal ? 'border-dashed border-slate-700' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-400 border-none" />
      
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className={`p-1.5 rounded-lg ${isExternal ? 'bg-slate-800' : 'bg-blue-600/30'}`}>
            {isExternal ? <BookOpen size={14} className="text-slate-400" /> : <FileText size={14} className="text-blue-400" />}
          </div>
          {data.scholarUrl && (
            <a href={data.scholarUrl} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-400 transition-colors">
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        <div>
          <h3 className={`text-xs font-bold leading-snug line-clamp-2 ${selected ? 'text-white' : 'text-slate-200'}`}>
            {data.label}
          </h3>
          {data.authors && (
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <User size={10} />
              <span className="truncate">{data.authors}</span>
            </p>
          )}
        </div>

        {isExternal && (
          <div className="mt-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 border border-slate-700 px-1.5 py-0.5 rounded">
              External Reference
            </span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-400 border-none" />
    </div>
  );
};

export default memo(PaperNode);
