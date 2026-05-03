import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { User, Binary, FileCode, TrendingUp, Calendar } from 'lucide-react';

interface PaperNodeData {
  label: string;
  scholarUrl?: string;
  authors?: string;
  isExternal?: boolean;
  influence?: number;
  year?: number;
  domain?: string;
  topic?: string;
}

interface PaperNodeProps {
  data: PaperNodeData;
  selected?: boolean;
}

const PaperNode = ({ data, selected }: PaperNodeProps) => {
  const isExternal = data.isExternal;
  // Scale node based on influence (citation count in workspace)
  const influence = data.influence || 0;
  const scale = 1 + Math.min(influence * 0.1, 0.5);

  return (
    <div 
      style={{ transform: `scale(${scale})` }}
      className={`px-4 py-3 shadow-2xl rounded border transition-all duration-300 min-w-[200px] max-w-[260px] select-none
      ${selected 
        ? 'bg-accent border-foreground ring-1 ring-foreground/20 z-50' 
        : 'bg-card border-border hover:border-foreground/40'}
      ${isExternal ? 'border-dashed' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-foreground/40 !border-none" />
      
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isExternal ? (
              <Binary size={12} className="text-muted-foreground" />
            ) : (
              <FileCode size={12} className="text-muted-foreground" />
            )}
            <span className="text-[9px] mono text-muted-foreground/60 font-bold uppercase tracking-wider">
              {isExternal ? 'EXT_REF' : 'DOC_NODE'}
            </span>
          </div>
          {influence > 0 && (
            <div className="flex items-center gap-1 text-primary animate-pulse">
              <TrendingUp size={10} />
              <span className="text-[9px] mono font-black">{influence}</span>
            </div>
          )}
        </div>

        <div>
          <h3 className={`text-[11px] font-semibold leading-relaxed line-clamp-2 ${selected ? 'text-foreground' : 'text-foreground/90'}`}>
            {data.label}
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 items-center text-[9px] mono text-muted-foreground">
            {data.authors && (
              <div className="flex items-center gap-1 truncate max-w-[120px]">
                <User size={9} />
                <span>{data.authors}</span>
              </div>
            )}
            {data.year && (
              <div className="flex items-center gap-1">
                <Calendar size={9} />
                <span>{data.year}</span>
              </div>
            )}
          </div>
        </div>

        {(data.domain || data.topic) && (
          <div className="pt-1 flex gap-1 overflow-hidden">
            {data.domain && (
              <span className="text-[7px] mono bg-foreground/5 border border-border px-1.5 py-0.5 rounded text-foreground/60 whitespace-nowrap">
                {data.domain}
              </span>
            )}
            {data.topic && (
              <span className="text-[7px] mono bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded text-primary/70 whitespace-nowrap">
                {data.topic}
              </span>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-foreground/40 !border-none" />
    </div>
  );
};

export default memo(PaperNode);
