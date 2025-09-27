import React, { useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Background,
  NodeTypes,
  ConnectionMode,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

import CustomNode from "./CustomNode";
import { NodeData } from "../types/topology";
import {
  findConnectedComponents,
  detectComponentTopology,
} from "../utils/graphUtils";

interface TopologyDisplayProps {
  nodes: NodeData[];
  selectedNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
}

const ReadOnlyNode: React.FC<any> = ({ data }) => {
  const isSelected = data.isSelected;

  return (
    <div
      style={{
        background: isSelected ? "#e3f2fd" : "#fff",
        border: `2px solid ${isSelected ? "#2196f3" : "#333"}`,
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px",
        textAlign: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <div
        style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "14px" }}
      >
        {data.label}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "#666",
          background: "#f5f5f5",
          padding: "2px 6px",
          borderRadius: "4px",
        }}
      >
        {data.program}
      </div>
      {isSelected && (
        <div
          style={{
            fontSize: "10px",
            color: "#2196f3",
            marginTop: "4px",
            fontWeight: "bold",
          }}
        >
          SELECTED
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  readOnly: ReadOnlyNode,
};

const TopologyDisplay: React.FC<TopologyDisplayProps> = ({
  nodes: nodeData,
  selectedNodeId,
  onNodeClick,
}) => {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    onNodeClick?.(node.id);
  };

  // Calculate positions for nodes in a component (simplified version)
  const calculateComponentPositions = (
    component: NodeData[],
    topology: string,
    centerX: number,
    centerY: number,
  ) => {
    const totalNodes = component.length;
    const radius = Math.max(80, 60 + totalNodes * 15);
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
          120,
          Math.min(180, 400 / Math.max(totalNodes - 1, 1)),
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
          const spacing = 120;
          positions[node.id] = {
            x: centerX - (cols * spacing) / 2 + (index % cols) * spacing,
            y:
              centerY -
              (Math.ceil(totalNodes / cols) * spacing) / 2 +
              Math.floor(index / cols) * spacing,
          };
        }
      } else {
        // Default grid layout
        const cols = Math.min(3, totalNodes);
        const spacing = 150;
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

  // Calculate topology bounds (simplified)
  const calculateTopologyBounds = (component: NodeData[], topology: string) => {
    const totalNodes = component.length;
    const radius = Math.max(80, 60 + totalNodes * 15);
    const nodeSize = 60;

    let width: number, height: number;

    if (topology === "ring" && totalNodes > 2) {
      width = height = radius * 2 + nodeSize;
    } else if (topology === "line") {
      const spacing = Math.max(
        120,
        Math.min(180, 400 / Math.max(totalNodes - 1, 1)),
      );
      width = (totalNodes - 1) * spacing + nodeSize;
      height = nodeSize + 40;
    } else if (topology === "fully_connected") {
      if (totalNodes <= 6) {
        width = height = radius * 2 + nodeSize;
      } else {
        const cols = Math.ceil(Math.sqrt(totalNodes));
        const rows = Math.ceil(totalNodes / cols);
        const spacing = 120;
        width = cols * spacing + nodeSize;
        height = rows * spacing + nodeSize;
      }
    } else {
      const cols = Math.min(3, totalNodes);
      const rows = Math.ceil(totalNodes / cols);
      const spacing = 150;
      width = cols * spacing + nodeSize;
      height = rows * spacing + nodeSize;
    }

    return { width, height };
  };

  // Calculate component centers (simplified)
  const calculateComponentCenters = (components: NodeData[][]) => {
    const canvasWidth = 600;
    const canvasHeight = 400;
    const padding = 40;
    const centers: { x: number; y: number }[] = [];

    if (components.length === 1) {
      centers.push({ x: canvasWidth / 2, y: canvasHeight / 2 });
    } else {
      components.forEach((component, index) => {
        const topology = detectComponentTopology(component);
        const bounds = calculateTopologyBounds(component, topology);

        // Simple layout for multiple components
        const cols = Math.ceil(Math.sqrt(components.length));
        const row = Math.floor(index / cols);
        const col = index % cols;

        const x = bounds.width / 2 + padding + col * (canvasWidth / cols);
        const y =
          bounds.height / 2 +
          padding +
          row * (canvasHeight / Math.ceil(components.length / cols));

        centers.push({ x, y });
      });
    }

    return centers;
  };

  // Convert NodeData to ReactFlow nodes
  useEffect(() => {
    if (!nodeData || nodeData.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const components = findConnectedComponents(nodeData);
    const centers = calculateComponentCenters(components);
    const allPositions: Record<string, { x: number; y: number }> = {};

    // Calculate positions for each component
    components.forEach((component, componentIndex) => {
      const topology = detectComponentTopology(component);
      const center = centers[componentIndex] || { x: 300, y: 200 };
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
      type: "readOnly",
      position: allPositions[node.id] || { x: 0, y: 0 },
      data: {
        label: node.id,
        program: node.program,
        isSelected: selectedNodeId === node.id,
      },
      draggable: false,
      selectable: false,
    }));

    const flowEdges: Edge[] = [];
    nodeData.forEach((node) => {
      node.connections.forEach((targetId) => {
        if (nodeData.some((n) => n.id === targetId)) {
          const edgeId = `${node.id}-${targetId}`;
          const reverseEdgeId = `${targetId}-${node.id}`;

          // Only add edge if reverse doesn't exist
          if (!flowEdges.some((e) => e.id === reverseEdgeId)) {
            flowEdges.push({
              id: edgeId,
              source: node.id,
              target: targetId,
              type: "straight",
              style: { stroke: "#333", strokeWidth: 2 },
            });
          }
        }
      });
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [nodeData, selectedNodeId, onNodeClick, setNodes, setEdges]);

  return (
    <div
      style={{
        width: "100%",
        height: "300px",
        border: "1px solid #ddd",
        borderRadius: "4px",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        nodesFocusable={true}
        connectionMode={ConnectionMode.Loose}
      >
        <Background />
      </ReactFlow>
    </div>
  );
};

export default TopologyDisplay;

