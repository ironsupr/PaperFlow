import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType, 
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store/useStore';
import ContextMenu from './ContextMenu';
import PaperNode from './PaperNode';
import { Maximize2, MessageSquare, Layers, Loader2 } from 'lucide-react';

const nodeTypes = {
  paper: PaperNode,
};

const GraphView = () => {
  const { graphData, setSelectedPaperId, focusedPaperId, setFocusedPaperId, papers } = useStore();
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [edgeContext, setEdgeContext] = useState<string[] | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Sync local ReactFlow state with store data
  useEffect(() => {
    let filteredNodes = [...graphData.nodes];
    let filteredEdges = [...graphData.edges];

    if (focusedPaperId) {
      const focusedIdStr = String(focusedPaperId);
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
        color: '#3b82f6',
      },
      style: { stroke: '#3b82f6', strokeWidth: 2, opacity: 0.6 },
      animated: true,
    })));

    // Once we have data or papers list is confirmed empty, hide initial loader
    if (graphData.nodes.length > 0 || papers.length === 0) {
      setIsInitialLoad(false);
    }
  }, [graphData, focusedPaperId, papers.length, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedPaperId(Number(node.id));
    setMenu(null);
    setEdgeContext(null);
  }, [setSelectedPaperId]);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    if (edge.data?.context) {
      setEdgeContext(edge.data.context);
    } else {
      setEdgeContext(null);
    }
  }, []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
      });
    },
    [setMenu]
  );

  const onPaneClick = useCallback(() => {
    setMenu(null);
    setEdgeContext(null);
  }, []);

  return (
    <div className="w-full h-full relative bg-[#0f172a]" onClick={onPaneClick}>
      {isInitialLoad && papers.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-blue-500 animate-spin" size={32} />
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Initializing Neural Map</p>
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
        style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}
      >
        <Background color="#334155" gap={30} size={1} variant="dots" />
        
        <Controls className="bg-slate-900 border border-white/10 fill-white !shadow-2xl" />
        
        <MiniMap 
          nodeColor={(node) => {
            return (node.data?.isExternal ? '#334155' : '#3b82f6');
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
          className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden !m-4"
        />

        <Panel position="top-right" className="flex flex-col gap-3 items-end">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPaperId(null);
              setFocusedPaperId(null);
              setEdgeContext(null);
            }}
            className="group flex items-center gap-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-xl hover:border-blue-500/50 transition-all shadow-2xl text-white text-xs font-bold"
          >
            <Layers size={14} className="text-blue-400 group-hover:rotate-12 transition-transform" />
            Clear Focus & Reset
          </button>
          
          {edgeContext && (
            <div 
              className="p-5 bg-slate-900/90 backdrop-blur-2xl border border-blue-500/30 rounded-2xl w-80 shadow-2xl animate-in fade-in slide-in-from-right-4 ring-1 ring-blue-500/20" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <MessageSquare size={16} className="text-blue-400" />
                </div>
                <h5 className="text-white font-bold text-xs uppercase tracking-widest">
                  Citation Context
                </h5>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {edgeContext.map((c, i) => (
                  <p key={i} className="text-[11px] text-slate-300 italic leading-relaxed border-l-2 border-blue-500/40 pl-3 py-1">
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

export default GraphView;
