export interface NodeData {
  id: string;
  program: string;
  connections: string[];
}

export interface TopologyConfig {
  type: 'ring' | 'line' | 'fully_connected' | 'custom';
  numberOfNodes?: number;
  program: string;
  nidPrefix?: string;
}

export interface IndividualNode {
  nid: string;
  program: string;
  connections: string[];
}

export interface YamlConfig {
  topologies?: TopologyConfig[];
  individual_nodes?: IndividualNode[];
}

export interface JitterConfig {
  dropRate: number; // 0.0 to 1.0
  delayMs: number;  // milliseconds
}

export interface SimulationConfig {
  topology: YamlConfig;
  jitter: JitterConfig;
}