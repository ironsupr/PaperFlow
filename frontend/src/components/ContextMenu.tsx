import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../api/client';
import { Trash2, Maximize2, Layers, Info } from 'lucide-react';

interface ContextMenuProps {
  id: string; // Can be paper_1 or 1
  top: number;
  left: number;
  onClose: () => void;
}

const ContextMenu = ({ id, top, left, onClose }: ContextMenuProps) => {
  const { fetchPapers, setSelectedPaperId, addFloatingReader, setMaximizedReaderId } = useStore();
  const numericId = Number(id.replace('paper_', ''));

  const handleDetails = useCallback(() => {
    setSelectedPaperId(numericId);
    onClose();
  }, [numericId, setSelectedPaperId, onClose]);

  const handleOpenPopup = useCallback(() => {
    addFloatingReader(numericId);
    onClose();
  }, [numericId, addFloatingReader, onClose]);

  const handleOpenFullscreen = useCallback(() => {
    setMaximizedReaderId(numericId);
    onClose();
  }, [numericId, setMaximizedReaderId, onClose]);

  const handleDelete = useCallback(async () => {
    if (window.confirm("Delete this paper?")) {
      try {
        await api.deletePaper(numericId);
        await fetchPapers();
        onClose();
      } catch (error) {
        console.error('Failed to delete paper:', error);
      }
    }
  }, [numericId, fetchPapers, onClose]);

  return (
    <div
      className="fixed z-[300] bg-card border border-border rounded shadow-2xl overflow-hidden py-1 min-w-[180px] font-sans animate-in fade-in zoom-in-95"
      style={{ top, left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 border-b border-border/50">
        <span className="text-[9px] mono font-bold text-muted-foreground uppercase tracking-widest">Document Options</span>
      </div>
      
      <MenuButton onClick={handleDetails} icon={<Info size={14} />} label="View Metadata" />
      <MenuButton onClick={handleOpenPopup} icon={<Layers size={14} />} label="Open as Popup" />
      <MenuButton onClick={handleOpenFullscreen} icon={<Maximize2 size={14} />} label="Open Fullscreen" />
      
      <div className="h-px bg-border my-1" />
      
      <button
        onClick={handleDelete}
        className="w-full flex items-center gap-2.5 px-4 py-2 text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
      >
        <Trash2 size={14} /> Delete Paper
      </button>
    </div>
  );
};

const MenuButton = ({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-4 py-2 text-[11px] font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors text-left"
  >
    {icon} {label}
  </button>
);

export default ContextMenu;
