import { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType, 
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store/useStore';
import ContextMenu from './ContextMenu';
import PaperNode from './PaperNode';
import ConceptNode from './ConceptNode';
import { MessageSquare, Loader2, RotateCcw, Network, Calendar, LayoutGrid, Layers } from 'lucide-react';

const nodeTypes = {
  paper: PaperNode,
  concept: ConceptNode,
};

const GraphView = () => {
  const { graphData, setSelectedPaperId, focusedPaperId, setFocusedPaperId, papers, fetchGraphData, calculateLayout } = useStore();
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [edgeContext, setEdgeContext] = useState<string[] | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'standard' | 'timeline' | 'clusters'>('standard');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Sync local ReactFlow state with store data
  useEffect(() => {
    if (graphData.nodes.length === 0) return;

    let filteredNodes = [...graphData.nodes];
    let filteredEdges = [...graphData.edges];

    if (focusedPaperId) {
      const focusedIdStr = `paper_${focusedPaperId}`;
      const connectedNodeIds = new Set<string>([focusedIdStr]);
      
      graphData.edges.forEach(edge => {
        if (edge.source === focusedIdStr) connectedNodeIds.add(edge.target);
        if (edge.target === focusedIdStr) connectedNodeIds.add(edge.source);
      });

      filteredNodes = graphData.nodes.filter(node => connectedNodeIds.has(node.id));
      filteredEdges = graphData.edges.filter(edge => 
        connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target)
      );
    }

    setNodes(filteredNodes);
    setEdges(filteredEdges.map(edge => ({
      ...edge,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#ffffff',
      },
      style: { 
        stroke: '#ffffff', 
        strokeWidth: edge.type === 'semantic' ? 2 : 2.5, 
        opacity: edge.type === 'semantic' ? 0.5 : 0.8,
        strokeDasharray: edge.type === 'semantic' ? '5 5' : 'none'
      },
      animated: edge.type === 'citation',
    })));

    setInitialLoadComplete(true);
  }, [graphData, focusedPaperId, setNodes, setEdges]);

  const handleLayoutChange = (mode: 'standard' | 'timeline' | 'clusters') => {
    setLayoutMode(mode);
    calculateLayout(mode);
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'paper') {
      setSelectedPaperId(Number(node.id.replace('paper_', '')));
    }
    setMenu(null);
    setEdgeContext(null);
  }, [setSelectedPaperId]);

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (edge.data?.context) {
      setEdgeContext(edge.data.context);
    } else {
      setEdgeContext(null);
    }
  }, []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      // Only show for papers for now
      if (node.type === 'paper') {
        setMenu({
          id: node.id, // e.g. paper_1
          top: event.clientY,
          left: event.clientX,
        });
      }
    },
    [setMenu]
  );

  const onPaneClick = useCallback(() => {
    setMenu(null);
    setEdgeContext(null);
  }, []);

  return (
    <div className="w-full h-full relative bg-background" onClick={onPaneClick}>
      {!initialLoadComplete && papers.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-primary animate-spin" size={24} />
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">Mapping Neural Nodes</p>
          </div>
        </div>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeContextMenu={onNodeContextMenu}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnScroll={true}
        selectionOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        style={{ width: '100%', height: '100%' }}
      >
        <Background color="#27272a" gap={20} size={1} variant={BackgroundVariant.Dots} />
        
        <Controls className="bg-card border border-border fill-foreground !shadow-none rounded-md overflow-hidden" />
        
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === 'concept') return '#ffffff';
            return (node.data?.isExternal ? '#27272a' : '#fafafa');
          }}
          maskColor="rgba(9, 9, 11, 0.7)"
          className="bg-card border border-border rounded-md overflow-hidden !m-4 !shadow-none"
        />

        <Panel position="top-right" className="flex flex-col gap-2 items-end">
          {/* Discovery Layout Controls */}
          <div className="flex bg-card border border-border rounded-md p-1 shadow-sm gap-1">
            <LayoutButton active={layoutMode === 'standard'} onClick={() => handleLayoutChange('standard')} icon={<LayoutGrid size={12} />} label="Standard" />
            <LayoutButton active={layoutMode === 'timeline'} onClick={() => handleLayoutChange('timeline')} icon={<Calendar size={12} />} label="Timeline" />
            <LayoutButton active={layoutMode === 'clusters'} onClick={() => handleLayoutChange('clusters')} icon={<Layers size={12} />} label="Clusters" />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                fetchGraphData();
              }}
              className="group flex items-center gap-2 bg-primary text-primary-foreground border border-primary px-3 py-1.5 rounded-md hover:opacity-90 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
            >
              <Network size={12} />
              Semantic Map
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPaperId(null);
                setFocusedPaperId(null);
                setEdgeContext(null);
              }}
              className="group flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary/50 transition-all text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-wider shadow-sm"
            >
              <RotateCcw size={12} className="group-hover:-rotate-45 transition-transform" />
              Reset
            </button>
          </div>
          
          {edgeContext && (
            <div 
              className="p-4 bg-card border border-border rounded-lg w-72 shadow-2xl animate-in fade-in slide-in-from-right-2 ring-1 ring-primary/5" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} className="text-primary" />
                <h5 className="text-foreground font-black text-[10px] uppercase tracking-widest">
                  Citation Context
                </h5>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {edgeContext.map((c, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground italic leading-relaxed border-l border-primary/20 pl-3 py-1">
                    "{c}"
                  </p>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </ReactFlow>
      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
};

const LayoutButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all text-[9px] font-bold uppercase tracking-tight
      ${active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default GraphView;
