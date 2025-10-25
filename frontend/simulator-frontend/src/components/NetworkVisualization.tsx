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
import {
  findConnectedComponents,
  detectComponentTopology,
} from "../utils/graphUtils";

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

  // Calculate positions for nodes in a component
  const calculateComponentPositions = (
    component: NodeData[],
    topology: string,
    centerX: number,
    centerY: number,
  ) => {
    const totalNodes = component.length;
    const radius = Math.max(120, 80 + totalNodes * 20);
    const positions: Record<string, { x: number; y: number }> = {};

    component.forEach((node, index) => {
      if (topology === "ring" && totalNodes > 2) {
        const angle = (2 * Math.PI * index) / totalNodes - Math.PI / 2;
        positions[node.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      } else if (topology === "line") {
        const spacing = Math.max(
          180,
          Math.min(250, 800 / Math.max(totalNodes - 1, 1)),
        );
        positions[node.id] = {
          x: centerX - ((totalNodes - 1) * spacing) / 2 + index * spacing,
          y: centerY,
        };
      } else if (topology === "fully_connected") {
        if (totalNodes <= 6) {
          const angle = (2 * Math.PI * index) / totalNodes;
          positions[node.id] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          };
        } else {
          const cols = Math.ceil(Math.sqrt(totalNodes));
          const spacing = 150;
          positions[node.id] = {
            x: centerX - (cols * spacing) / 2 + (index % cols) * spacing,
            y:
              centerY -
              (Math.ceil(totalNodes / cols) * spacing) / 2 +
              Math.floor(index / cols) * spacing,
          };
        }
      } else {
        // Default grid layout for custom/single nodes
        const cols = Math.min(3, totalNodes);
        const spacing = 200;
        positions[node.id] = {
          x: centerX - (cols * spacing) / 2 + (index % cols) * spacing,
          y:
            centerY -
            (Math.ceil(totalNodes / cols) * spacing) / 2 +
            Math.floor(index / cols) * spacing,
        };
      }
    });

    return positions;
  };

  // Calculate the bounding box dimensions for a topology
  const calculateTopologyBounds = (component: NodeData[], topology: string) => {
    const totalNodes = component.length;
    const radius = Math.max(120, 80 + totalNodes * 20);
    const nodeSize = 80; // Approximate node size including padding

    let width: number, height: number;

    if (topology === "ring" && totalNodes > 2) {
      // Circle: diameter + node size
      width = height = radius * 2 + nodeSize;
    } else if (topology === "line") {
      // Line: length + node size
      const spacing = Math.max(
        180,
        Math.min(250, 800 / Math.max(totalNodes - 1, 1)),
      );
      width = (totalNodes - 1) * spacing + nodeSize;
      height = nodeSize + 50; // Small height padding
    } else if (topology === "fully_connected") {
      if (totalNodes <= 6) {
        // Circle layout
        width = height = radius * 2 + nodeSize;
      } else {
        // Grid layout
        const cols = Math.ceil(Math.sqrt(totalNodes));
        const rows = Math.ceil(totalNodes / cols);
        const spacing = 150;
        width = cols * spacing + nodeSize;
        height = rows * spacing + nodeSize;
      }
    } else {
      // Custom/single nodes - grid
      const cols = Math.min(3, totalNodes);
      const rows = Math.ceil(totalNodes / cols);
      const spacing = 200;
      width = cols * spacing + nodeSize;
      height = rows * spacing + nodeSize;
    }

    return { width, height };
  };

  // Calculate non-overlapping positions for topology components
  const calculateComponentCenters = (components: NodeData[][]) => {
    const canvasWidth = 1400;
    const canvasHeight = 900;
    const padding = 50;
    const centers: { x: number; y: number }[] = [];
    const placedBoxes: {
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];

    components.forEach((component, index) => {
      const topology = detectComponentTopology(component);
      const bounds = calculateTopologyBounds(component, topology);

      let bestPosition = { x: 0, y: 0 };
      let placed = false;

      // Try different positions to avoid overlap
      for (let attempts = 0; attempts < 50 && !placed; attempts++) {
        let candidateX: number, candidateY: number;

        if (index === 0) {
          // First component - center it
          candidateX = canvasWidth / 2;
          candidateY = canvasHeight / 2;
        } else if (index === 1) {
          // Second component - try left side first
          candidateX = bounds.width / 2 + padding;
          candidateY = canvasHeight / 2;
        } else {
          // Additional components - try various positions
          const gridCols = Math.ceil(Math.sqrt(components.length));
          const idealCol = index % gridCols;
          const idealRow = Math.floor(index / gridCols);

          candidateX =
            bounds.width / 2 + padding + idealCol * (canvasWidth / gridCols);
          candidateY =
            bounds.height / 2 +
            padding +
            idealRow * (canvasHeight / Math.ceil(components.length / gridCols));

          // Add some randomness if the ideal position fails
          if (attempts > 0) {
            candidateX += (Math.random() - 0.5) * 200;
            candidateY += (Math.random() - 0.5) * 200;
          }
        }

        // Ensure within canvas bounds
        candidateX = Math.max(
          bounds.width / 2 + padding,
          Math.min(canvasWidth - bounds.width / 2 - padding, candidateX),
        );
        candidateY = Math.max(
          bounds.height / 2 + padding,
          Math.min(canvasHeight - bounds.height / 2 - padding, candidateY),
        );

        // Check for overlap with existing components
        const newBox = {
          x: candidateX - bounds.width / 2,
          y: candidateY - bounds.height / 2,
          width: bounds.width,
          height: bounds.height,
        };

        const hasOverlap = placedBoxes.some(
          (box) =>
            !(
              newBox.x + newBox.width + padding < box.x ||
              box.x + box.width + padding < newBox.x ||
              newBox.y + newBox.height + padding < box.y ||
              box.y + box.height + padding < newBox.y
            ),
        );

        if (!hasOverlap) {
          bestPosition = { x: candidateX, y: candidateY };
          placedBoxes.push(newBox);
          placed = true;
        }
      }

      // Fallback position if no good spot found
      if (!placed) {
        bestPosition = {
          x:
            bounds.width / 2 +
            padding +
            ((index * 300) % (canvasWidth - bounds.width)),
          y:
            bounds.height / 2 +
            padding +
            Math.floor((index * 300) / (canvasWidth - bounds.width)) * 250,
        };
      }

      centers.push(bestPosition);
    });

    return centers;
  };

  // Convert NodeData to ReactFlow nodes
  useEffect(() => {
    const components = findConnectedComponents(nodeData);
    const centers = calculateComponentCenters(components);
    const allPositions: Record<string, { x: number; y: number }> = {};

    // Calculate positions for each component
    components.forEach((component, componentIndex) => {
      const topology = detectComponentTopology(component);
      const center = centers[componentIndex] || { x: 400, y: 300 };
      const componentPositions = calculateComponentPositions(
        component,
        topology,
        center.x,
        center.y,
      );
      Object.assign(allPositions, componentPositions);
    });

    const flowNodes: Node[] = nodeData.map((node) => ({
      id: node.id,
      type: "custom",
      position: allPositions[node.id] || { x: 0, y: 0 },
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
    }));

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
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default NetworkVisualization;
