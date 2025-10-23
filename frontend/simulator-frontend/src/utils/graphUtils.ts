import { NodeData } from "../types/topology";

// Find connected components (isolated sub-graphs)
export const findConnectedComponents = (nodes: NodeData[]): NodeData[][] => {
  const visited = new Set<string>();
  const components: NodeData[][] = [];

  const dfs = (nodeId: string, component: NodeData[]) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    component.push(node);

    // Visit all connected nodes
    node.connections.forEach((connectedId) => {
      if (!visited.has(connectedId)) {
        dfs(connectedId, component);
      }
    });
  };

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      const component: NodeData[] = [];
      dfs(node.id, component);
      components.push(component);
    }
  });

  return components;
};

// Detect topology type for a connected component
export const detectComponentTopology = (component: NodeData[]) => {
  if (component.length <= 1) return "single";

  // Check if it's a ring: all nodes have exactly 2 connections
  const isRing = component.every((node) => node.connections.length === 2);

  if (isRing) return "ring";

  // Check if it's a line: exactly 2 nodes with 1 connection (endpoints), rest with 2
  const nodesWithOneConnection = component.filter(
    (node) => node.connections.length === 1
  );
  const nodesWithTwoConnections = component.filter(
    (node) => node.connections.length === 2
  );

  const isLine =
    nodesWithOneConnection.length === 2 &&
    nodesWithTwoConnections.length === component.length - 2 &&
    component.length >= 2;

  if (isLine) return "line";

  // Check if it's fully connected: every node connects to all others
  const isFullyConnected = component.every(
    (node) => node.connections.length === component.length - 1
  );

  if (isFullyConnected) return "fully_connected";

  // Otherwise it's a custom topology
  return "custom";
};
