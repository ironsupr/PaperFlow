import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Sparkles } from 'lucide-react';

interface ConceptNodeData {
  label: string;
  description?: string;
}

const ConceptNode = ({ data, selected }: { data: ConceptNodeData; selected: boolean }) => {
  return (
    <div className={`px-4 py-3 shadow-2xl rounded-full border transition-all duration-300 min-w-[140px] max-w-[200px] select-none text-center
      ${selected 
        ? 'bg-primary text-primary-foreground border-primary ring-4 ring-primary/20 scale-110' 
        : 'bg-card border-border hover:border-primary/40'}
    `}>
      <Handle type="target" position={Position.Top} className="!w-1 !h-1 !bg-primary/40 !border-none" />
      
      <div className="flex flex-col items-center gap-1.5">
        <div className={`p-1.5 rounded-full ${selected ? 'bg-primary-foreground/20' : 'bg-primary/10'}`}>
          <Sparkles size={12} className={selected ? 'text-primary-foreground' : 'text-primary'} />
        </div>
        
        <h3 className={`text-[10px] font-bold leading-tight uppercase tracking-wider ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
          {data.label}
        </h3>
        
        {data.description && selected && (
          <p className="mt-2 text-[8px] text-primary-foreground/80 leading-snug max-w-[160px]">
            {data.description}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-1 !h-1 !bg-primary/40 !border-none" />
    </div>
  );
};

export default memo(ConceptNode);
