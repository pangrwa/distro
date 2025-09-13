export interface NodeData {
  id: string;
  program: string;
  connections: string[];
}

export interface TopologyConfig {
  type: "ring" | "line" | "fully_connected" | "custom";
  number_of_nodes?: number;
  program: string;
  nid_prefix?: string;
}

export interface IndividualNode {
  nid: string;
  program: string;
  connections: string[];
}

export interface JitterConfig {
  drop_rate: number; // 0.0 to 1.0
  delay_ms: number; // milliseconds
}

export interface YamlConfig {
  topologies?: TopologyConfig[];
  individual_nodes?: IndividualNode[];
  network_jitter_config?: JitterConfig;
}

// export interface SimulationConfig {
//   topology: YamlConfig;
//   jitter: JitterConfig;
// }
