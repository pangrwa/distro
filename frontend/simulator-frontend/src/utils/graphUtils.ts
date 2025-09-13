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

  const isRing = component.every((node) => {
    return (
      node.connections.length === 1 ||
      (node.connections.length === 2 && component.length > 2)
    );
  });

  const isLine =
    component.some((node) => node.connections.length === 1) &&
    component.some((node) => node.connections.length === 2);

  const avgConnections =
    component.reduce((sum, node) => sum + node.connections.length, 0) /
    component.length;
  const isFullyConnected = avgConnections > component.length * 0.7;

  if (isRing && !isLine) return "ring";
  if (isLine && !isFullyConnected) return "line";
  if (isFullyConnected) return "fully_connected";
  return "custom";
};
