import React, { useState, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType, 
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import type { Node, Edge, NodeChange, EdgeChange } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store/useStore';
import ContextMenu from './ContextMenu';
import { Maximize2 } from 'lucide-react';

const GraphView = () => {
  const { graphData, setSelectedPaperId, papers } = useStore();
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);

  // Local state for ReactFlow to handle dragging and updates correctly
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Update local nodes/edges when store data changes
  React.useEffect(() => {
    setNodes(graphData.nodes);
    setEdges(graphData.edges.map(edge => ({
      ...edge,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#3b82f6',
      },
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      animated: true,
    })));
  }, [graphData]);

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
  };

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

  const onPaneClick = useCallback(() => setMenu(null), []);

  return (
    <div style={{ width: '100%', height: '100%' }} onClick={onPaneClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
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
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPaperId(null);
            }}
            className="p-2 bg-slate-800 border border-white/10 rounded-lg hover:bg-slate-700 transition-colors text-white flex items-center gap-2 text-xs font-semibold shadow-lg"
          >
            <Maximize2 size={14} /> Reset View
          </button>
        </Panel>
      </ReactFlow>
      {menu && <ContextMenu onClick={onPaneClick} {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
};

export default GraphView;
