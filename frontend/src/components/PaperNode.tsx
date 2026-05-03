import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ExternalLink, User, Binary, FileCode } from 'lucide-react';

interface PaperNodeData {
  label: string;
  scholarUrl?: string;
  authors?: string;
  isExternal?: boolean;
}

interface PaperNodeProps {
  data: PaperNodeData;
  selected?: boolean;
}

const PaperNode = ({ data, selected }: PaperNodeProps) => {
  const isExternal = data.isExternal;

  return (
    <div className={`px-4 py-3 shadow-2xl rounded border transition-all duration-300 min-w-[200px] max-w-[260px] select-none
      ${selected 
        ? 'bg-accent border-foreground ring-1 ring-foreground/20' 
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
            <span className="text-[9px] mono text-muted-foreground/60">
              {isExternal ? 'EXT_REF' : 'DOC_NODE'}
            </span>
          </div>
          {data.scholarUrl && (
            <a href={data.scholarUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink size={10} />
            </a>
          )}
        </div>

        <div>
          <h3 className={`text-[11px] font-semibold leading-relaxed line-clamp-2 ${selected ? 'text-foreground' : 'text-foreground/90'}`}>
            {data.label}
          </h3>
          {data.authors && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[9px] mono text-muted-foreground">
              <User size={9} />
              <span className="truncate">{data.authors}</span>
            </div>
          )}
        </div>

        {isExternal && (
          <div className="pt-1">
            <span className="text-[8px] mono text-muted-foreground/50 border border-border px-1.5 py-0.5 rounded">
              UNLINKED_SOURCE
            </span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-foreground/40 !border-none" />
    </div>
  );
};

export default memo(PaperNode);
