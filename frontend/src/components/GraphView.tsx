import ReactFlow, { Background, Controls } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store/useStore';

const GraphView = () => {
  const { graphData, setSelectedPaperId } = useStore();

  const onNodeClick = (_: any, node: any) => {
    setSelectedPaperId(Number(node.id));
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={graphData.nodes}
        edges={graphData.edges}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background color="#334155" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default GraphView;
