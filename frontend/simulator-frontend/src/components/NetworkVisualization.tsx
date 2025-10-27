import React, { useCallback, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  NodeTypes,
  ConnectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { NodeData } from "../types/topology";
import CustomNode from "./CustomNode";

interface NetworkVisualizationProps {
  nodes: NodeData[];
  onNodesChange: (nodes: NodeData[]) => void;
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  nodes: nodeData,
  onNodesChange,
}) => {
  const [nodes, setNodes, onNodesChangeFlow] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Convert NodeData to ReactFlow nodes
  useEffect(() => {
    const flowNodes: Node[] = nodeData.map((node) => {
      // Find existing node to preserve its position
      const existingNode = nodes.find((n) => n.id === node.id);
      const position = existingNode?.position || {
        x: Math.random() * 400,
        y: Math.random() * 400,
      };

      return {
        id: node.id,
        type: "custom",
        position,
        data: {
          label: node.id,
          program: node.program,
          onProgramChange: (nodeId: string, program: string) => {
            const updatedNodes = nodeData.map((n) =>
              n.id === nodeId ? { ...n, program } : n,
            );
            onNodesChange(updatedNodes);
          },
          onDelete: (nodeId: string) => {
            const updatedNodes = nodeData.filter((n) => n.id !== nodeId);
            onNodesChange(updatedNodes);
          },
        },
      };
    });

    const flowEdges: Edge[] = [];
    nodeData.forEach((node) => {
      node.connections.forEach((targetId) => {
        if (nodeData.some((n) => n.id === targetId)) {
          const edgeId = `${node.id}-${targetId}`;
          const reverseEdgeId = `${targetId}-${node.id}`;

          // Only add edge if reverse doesn't exist (to avoid duplicates)
          if (!flowEdges.some((e) => e.id === reverseEdgeId)) {
            flowEdges.push({
              id: edgeId,
              source: node.id,
              target: targetId,
              type: "straight",
            });
          }
        }
      });
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [nodeData, setNodes, setEdges, onNodesChange]);

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const sourceId = params.source!;
      const targetId = params.target!;

      // Update the connections in nodeData
      const updatedNodes = nodeData.map((node) => {
        if (node.id === sourceId) {
          const newConnections = [...node.connections];
          if (!newConnections.includes(targetId)) {
            newConnections.push(targetId);
          }
          return {
            ...node,
            connections: newConnections,
          };
        }
        if (node.id === targetId) {
          const newConnections = [...node.connections];
          if (!newConnections.includes(sourceId)) {
            newConnections.push(sourceId);
          }
          return {
            ...node,
            connections: newConnections,
          };
        }
        return node;
      });

      onNodesChange(updatedNodes);
      setEdges((eds) => addEdge(params, eds));
    },
    [nodeData, onNodesChange, setEdges],
  );

  const onEdgeDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      edgesToDelete.forEach((edge) => {
        const sourceId = edge.source;
        const targetId = edge.target;

        const updatedNodes = nodeData.map((node) => {
          if (node.id === sourceId) {
            return {
              ...node,
              connections: node.connections.filter((id) => id !== targetId),
            };
          }
          if (node.id === targetId) {
            return {
              ...node,
              connections: node.connections.filter((id) => id !== sourceId),
            };
          }
          return node;
        });

        onNodesChange(updatedNodes);
      });
    },
    [nodeData, onNodesChange],
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeFlow}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgeDelete}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        nodesFocusable={true}
      >
        <Background />
      </ReactFlow>
    </div>
  );
};

export default NetworkVisualization;
