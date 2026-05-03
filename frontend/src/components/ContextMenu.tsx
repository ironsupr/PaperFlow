import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../api/client';
import { Trash2, ExternalLink, Info } from 'lucide-react';

interface ContextMenuProps {
  id: string;
  top: number;
  left: number;
  onClose: () => void;
}

const ContextMenu = ({ id, top, left, onClose }: ContextMenuProps) => {
  const { fetchPapers, setSelectedPaperId, setActiveReaderId } = useStore();

  const handleDetails = useCallback(() => {
    setSelectedPaperId(Number(id));
    onClose();
  }, [id, setSelectedPaperId, onClose]);

  const handleOpenReader = useCallback(() => {
    setActiveReaderId(Number(id));
    onClose();
  }, [id, setActiveReaderId, onClose]);

  const handleDelete = useCallback(async () => {
    try {
      await api.deletePaper(Number(id));
      await fetchPapers();
      onClose();
    } catch (error) {
      console.error('Failed to delete paper:', error);
    }
  }, [id, fetchPapers, onClose]);

  return (
    <div
      className="absolute z-50 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden py-1 min-w-[160px]"
      style={{ top, left }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleDetails}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-blue-600/20 transition-colors"
      >
        <Info size={14} /> View Details
      </button>
      <button
        onClick={handleOpenReader}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-blue-600/20 transition-colors"
      >
        <ExternalLink size={14} /> Open Reader
      </button>
      <div className="h-px bg-white/10 my-1" />
      <button
        onClick={handleDelete}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
      >
        <Trash2 size={14} /> Delete Paper
      </button>
    </div>
  );
};

export default ContextMenu;
