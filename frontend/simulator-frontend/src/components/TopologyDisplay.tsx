import React, { useEffect, useState, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  NodeTypes,
  ConnectionMode,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Pause, Play, Square } from "lucide-react";

import { NodeData } from "../types/topology";
import {
  findConnectedComponents,
  detectComponentTopology,
} from "../utils/graphUtils";

// CSS for animated edge dashes
const animationStyles = `
  @keyframes dashForward {
    0% {
      stroke-dashoffset: 10;
    }
    100% {
      stroke-dashoffset: -10;
    }
  }

  @keyframes dashReverse {
    0% {
      stroke-dashoffset: -10;
    }
    100% {
      stroke-dashoffset: 10;
    }
  }

  @keyframes dashBothDirections {
    0% {
      stroke-dashoffset: 10;
    }
    50% {
      stroke-dashoffset: -10;
    }
    100% {
      stroke-dashoffset: 10;
    }
  }
`;

// API functions for node control
const API_BASE_URL = "http://localhost:8080";

const pauseNode = async (nodeId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/simulation/node/pause`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: nodeId,
    });
    if (!response.ok) {
      throw new Error(`Failed to pause node: ${await response.text()}`);
    }
    return await response.text();
  } catch (error) {
    console.error("Error pausing node:", error);
    throw error;
  }
};

const resumeNode = async (nodeId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/simulation/node/resume`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: nodeId,
    });
    if (!response.ok) {
      throw new Error(`Failed to resume node: ${await response.text()}`);
    }
    return await response.text();
  } catch (error) {
    console.error("Error resuming node:", error);
    throw error;
  }
};

const stopNode = async (nodeId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/simulation/node/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: nodeId,
    });
    if (!response.ok) {
      throw new Error(`Failed to stop node: ${await response.text()}`);
    }
    return await response.text();
  } catch (error) {
    console.error("Error stopping node:", error);
    throw error;
  }
};

type NodeStatus = "running" | "paused" | "stopped";

interface TopologyDisplayProps {
  nodes: NodeData[];
  selectedNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
  onMessageAnimation?: (fromNode: string, toNode: string) => void;
  onSimulationStart?: () => void;
}

const ReadOnlyNode: React.FC<any> = ({ data }) => {
  const isSelected = data.isSelected;
  const nodeStatus: NodeStatus = data.status || "stopped";

  const handlePause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeStatus !== "running") return;
    try {
      await pauseNode(data.label);
      if (data.onStatusChange) {
        data.onStatusChange(data.label, "paused");
      }
    } catch (error) {
      alert(`Failed to pause node: ${error}`);
    }
  };

  const handleResume = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeStatus !== "paused") return;
    try {
      await resumeNode(data.label);
      if (data.onStatusChange) {
        data.onStatusChange(data.label, "running");
      }
    } catch (error) {
      alert(`Failed to resume node: ${error}`);
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to stop node ${data.label}? This node cannot be restarted once stopped.`,
      )
    ) {
      return;
    }
    try {
      await stopNode(data.label);
      if (data.onStatusChange) {
        data.onStatusChange(data.label, "stopped");
      }
    } catch (error) {
      alert(`Failed to stop node: ${error}`);
    }
  };

  // Determine border color based on status
  const getBorderColor = () => {
    if (nodeStatus === "paused") return "#ffc107"; // Yellow/amber for paused
    if (nodeStatus === "stopped") return "#6c757d"; // Gray for stopped
    if (isSelected) return "#2196f3"; // Blue for selected
    return "#28a745"; // Green for running
  };

  // Determine background color
  const getBackgroundColor = () => {
    if (nodeStatus === "paused") return "#fff8e1"; // Light yellow for paused
    if (nodeStatus === "stopped") return "#e8e8e8"; // Desaturated gray for stopped
    if (isSelected) return "#e3f2fd"; // Light blue for selected
    return "#fff"; // Default white
  };

  // Check button enable states
  const isStopped = nodeStatus === "stopped";
  const canPause = nodeStatus === "running";
  const canResume = nodeStatus === "paused";
  const canStop = nodeStatus === "running" || nodeStatus === "paused";

  return (
    <div
      style={{
        background: getBackgroundColor(),
        border: `3px solid ${getBorderColor()}`,
        borderRadius: "8px",
        padding: "10px",
        minWidth: "140px",
        textAlign: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <div
        style={{
          fontWeight: "bold",
          marginBottom: "4px",
          fontSize: "14px",
          color: isStopped ? "#999" : "#000",
        }}
      >
        {data.label}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: isStopped ? "#888" : "#666",
          background: isStopped ? "#ddd" : "#f5f5f5",
          padding: "2px 6px",
          borderRadius: "4px",
          marginBottom: "6px",
        }}
      >
        {data.program}
      </div>

      {/* Status indicator */}
      <div
        style={{
          fontSize: "9px",
          color: getBorderColor(),
          fontWeight: "bold",
          marginBottom: "6px",
          textTransform: "uppercase",
        }}
      >
        {nodeStatus}
      </div>

      {/* Control buttons */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          justifyContent: "center",
          marginTop: "6px",
        }}
      >
        <button
          onClick={handlePause}
          disabled={!canPause}
          title={
            !canPause
              ? nodeStatus === "stopped"
                ? "Node is stopped"
                : "Node must be running to pause"
              : "Pause node"
          }
          style={{
            padding: "4px 6px",
            background: canPause ? "#ffc107" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: canPause ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            fontSize: "10px",
            opacity: canPause ? 1 : 0.5,
          }}
        >
          <Pause size={12} />
        </button>
        <button
          onClick={handleResume}
          disabled={!canResume}
          title={
            !canResume
              ? nodeStatus === "stopped"
                ? "Node is stopped"
                : "Node must be paused to resume"
              : "Resume node"
          }
          style={{
            padding: "4px 6px",
            background: canResume ? "#28a745" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: canResume ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            fontSize: "10px",
            opacity: canResume ? 1 : 0.5,
          }}
        >
          <Play size={12} />
        </button>
        <button
          onClick={handleStop}
          disabled={!canStop}
          title={
            !canStop
              ? "Node already stopped"
              : "Stop node (cannot be restarted)"
          }
          style={{
            padding: "4px 6px",
            background: canStop ? "#dc3545" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: canStop ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            fontSize: "10px",
            opacity: canStop ? 1 : 0.5,
          }}
        >
          <Square size={12} />
        </button>
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
  onMessageAnimation,
  onSimulationStart,
}) => {
  const [nodes, setNodes, onNodesChangeFlow] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [activeAnimations, setActiveAnimations] = useState<
    Map<string, Set<"forward" | "reverse">>
  >(new Map());
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, NodeStatus>>(
    new Map(),
  );

  // Inject animation styles on component mount
  useEffect(() => {
    const styleId = "topology-animation-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = animationStyles;
      document.head.appendChild(style);
    }
    return () => {
      // Clean up is optional - leaving styles in place is fine
    };
  }, []);

  // Handler for node status changes
  const handleNodeStatusChange = useCallback(
    (nodeId: string, status: NodeStatus) => {
      setNodeStatuses((prev) => {
        const next = new Map(prev);
        next.set(nodeId, status);
        return next;
      });
    },
    [],
  );

  // Function to set all nodes to running when simulation starts
  const setAllNodesToRunning = useCallback(() => {
    setNodeStatuses((prev) => {
      const next = new Map(prev);
      nodeData.forEach((node) => {
        next.set(node.id, "running");
      });
      return next;
    });
  }, [nodeData]);

  // Expose the function to parent via window object
  useEffect(() => {
    if (onSimulationStart) {
      (window as any).__setAllNodesToRunning = setAllNodesToRunning;
    }
  }, [setAllNodesToRunning, onSimulationStart]);

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    onNodeClick?.(node.id);
  };

  // Function to animate a message between two nodes
  const animateMessage = useCallback(
    (fromNode: string, toNode: string) => {
      const edgeId1 = `${fromNode}-${toNode}`;
      const edgeId2 = `${toNode}-${fromNode}`;

      // Find which edge exists in the graph
      const existingEdgeId = edges.some((e) => e.id === edgeId1)
        ? edgeId1
        : edgeId2;

      // Determine direction: forward if existingEdge matches fromNode->toNode order
      const direction: "forward" | "reverse" =
        existingEdgeId === edgeId1 ? "forward" : "reverse";

      setActiveAnimations((prev) => {
        const next = new Map(prev);
        const directions = next.get(existingEdgeId) || new Set();
        directions.add(direction);
        next.set(existingEdgeId, directions);
        return next;
      });

      // Remove animation after 3 seconds
      setTimeout(() => {
        setActiveAnimations((prev) => {
          const next = new Map(prev);
          const directions = next.get(existingEdgeId);
          if (directions) {
            directions.delete(direction);
            if (directions.size === 0) {
              next.delete(existingEdgeId);
            } else {
              next.set(existingEdgeId, directions);
            }
          }
          return next;
        });
      }, 3000);
    },
    [edges],
  );

  // Expose animation function via callback
  useEffect(() => {
    if (onMessageAnimation) {
      (window as any).__animateMessage = animateMessage;
    }
  }, [animateMessage, onMessageAnimation]);

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
    if (!nodeData || nodeData.length === 0) {
      setNodes([]);
      setEdges([]);
      setHasInitialized(false);
      return;
    }

    // Only recalculate positions on initial load or when node structure changes
    if (!hasInitialized) {
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
        type: "readOnly",
        position: allPositions[node.id] || { x: 0, y: 0 },
        data: {
          label: node.id,
          program: node.program,
          isSelected: selectedNodeId === node.id,
          status: nodeStatuses.get(node.id) || "stopped",
          onStatusChange: handleNodeStatusChange,
        },
        draggable: true,
        selectable: true,
      }));

      setNodes(flowNodes);
      setHasInitialized(true);
    } else {
      // Only update the selection state and status without changing positions
      setNodes((currentNodes) =>
        currentNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            isSelected: selectedNodeId === node.id,
            status: nodeStatuses.get(node.id) || "stopped",
            onStatusChange: handleNodeStatusChange,
          },
        })),
      );
    }

    // Always update edges since they don't affect positions
    const flowEdges: Edge[] = [];
    nodeData.forEach((node) => {
      node.connections.forEach((targetId) => {
        if (nodeData.some((n) => n.id === targetId)) {
          const edgeId = `${node.id}-${targetId}`;
          const reverseEdgeId = `${targetId}-${node.id}`;

          // Only add edge if reverse doesn't exist
          if (!flowEdges.some((e) => e.id === reverseEdgeId)) {
            const directions = activeAnimations.get(edgeId) || new Set();
            const hasForward = directions.has("forward");
            const hasReverse = directions.has("reverse");
            const hasBoth = hasForward && hasReverse;
            const isAnimating = hasForward || hasReverse;

            // Determine animation name based on direction
            let animationName = "none";
            if (isAnimating) {
              if (hasBoth) {
                animationName = "dashBothDirections";
              } else if (hasForward) {
                animationName = "dashForward";
              } else if (hasReverse) {
                animationName = "dashReverse";
              }
            }

            flowEdges.push({
              id: edgeId,
              source: node.id,
              target: targetId,
              type: "straight",
              animated: false, // We're handling animation with CSS
              style: {
                stroke: hasBoth ? "#9c27b0" : isAnimating ? "#ff6b6b" : "#333",
                strokeWidth: isAnimating ? 3 : 2,
                strokeDasharray: isAnimating ? "5,5" : "0",
                strokeDashoffset: "0",
                animation: `${animationName} 0.5s linear infinite`,
              } as React.CSSProperties,
            });
          }
        }
      });
    });

    setEdges(flowEdges);
  }, [
    nodeData,
    selectedNodeId,
    hasInitialized,
    activeAnimations,
    nodeStatuses,
    handleNodeStatusChange,
    setNodes,
    setEdges,
  ]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: "1px solid #ddd",
        borderRadius: "4px",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChangeFlow}
        onNodeClick={handleNodeClick}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        nodesFocusable={true}
        connectionMode={ConnectionMode.Loose}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default TopologyDisplay;
