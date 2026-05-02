import React, { useState, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType, 
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import type { Node, Edge, NodeChange, EdgeChange } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store/useStore';
import ContextMenu from './ContextMenu';
import { Maximize2, MessageSquare } from 'lucide-react';

const GraphView = () => {
  const { graphData, setSelectedPaperId, focusedPaperId, setFocusedPaperId, papers } = useStore();
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [edgeContext, setEdgeContext] = useState<string[] | null>(null);

  // Local state for ReactFlow to handle dragging and updates correctly
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Update local nodes/edges when store data changes or focus changes
  React.useEffect(() => {
    let filteredNodes = graphData.nodes;
    let filteredEdges = graphData.edges;

    if (focusedPaperId) {
      const focusedIdStr = String(focusedPaperId);
      const connectedNodeIds = new Set<string>([focusedIdStr]);
      
      // Find direct connections
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
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      animated: true,
    })));
  }, [graphData, focusedPaperId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = (_: any, node: any) => {
    const paper = papers.find(p => p.id === Number(node.id));
    if (paper?.is_external === 1 && paper?.scholar_url) {
      window.open(paper.scholar_url, '_blank');
    }
    setSelectedPaperId(Number(node.id));
    setMenu(null);
    setEdgeContext(null);
  };

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
    <div style={{ width: '100%', height: '100%' }} onClick={onPaneClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
        style={{ background: '#0f172a' }}
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            return (node.style?.background as string) || '#1e293b';
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
          style={{ background: '#1e293b' }}
        />
        <Panel position="top-right">
          <div className="flex flex-col gap-2 items-end">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPaperId(null);
                setFocusedPaperId(null);
                setEdgeContext(null);
              }}
              className="p-2 bg-slate-800 border border-white/10 rounded-lg hover:bg-slate-700 transition-colors text-white flex items-center gap-2 text-xs font-semibold shadow-lg"
            >
              <Maximize2 size={14} /> Reset View
            </button>
            
            {edgeContext && (
              <div className="mt-4 p-4 bg-slate-800/90 backdrop-blur-md border border-blue-500/30 rounded-xl w-80 shadow-2xl animate-in fade-in slide-in-from-right-4" onClick={e => e.stopPropagation()}>
                <h5 className="text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                  <MessageSquare size={12} /> Citation Context
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {edgeContext.map((c, i) => (
                    <p key={i} className="text-xs text-gray-200 italic leading-relaxed border-l-2 border-blue-500/30 pl-2">
                      "{c}"
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
      {menu && <ContextMenu onClick={onPaneClick} {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
};

export default GraphView;
