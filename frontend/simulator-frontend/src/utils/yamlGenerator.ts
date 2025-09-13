import { dump } from "js-yaml";
import { Component } from "lucide-react";
import {
  NodeData,
  YamlConfig,
  JitterConfig,
  TopologyConfig,
} from "../types/topology";
import { detectComponentTopology, findConnectedComponents } from "./graphUtils";

export const generateYaml = (
  nodes: NodeData[],
  jitterConfig: JitterConfig,
): string => {
  let config: YamlConfig = {};

  const components: NodeData[][] = findConnectedComponents(nodes);
  components.forEach((component, index) => {
    const topology = detectComponentTopology(component);
    if (["ring", "line", "fully_connected"].includes(topology)) {
      config = {
        ...config,
        topologies: [
          ...(config.topologies ?? []),
          {
            type: topology as TopologyConfig["type"],
            number_of_nodes: component.length,
            program: component[0].program,
            nid_prefix: topology + "-node-",
          },
        ],
      };
    } else {
      config = {
        ...config,
        individual_nodes: [
          ...(config.individual_nodes ?? []),
          ...component.map((node) => ({
            nid: node.id,
            program: node.program,
            connections: node.connections,
          })),
        ],
      };
    }
  });

  config = {
    ...config,
    network_jitter_config: jitterConfig,
  };
  return dump(config, { indent: 2 });
};

export const parseYaml = (
  yamlContent: string,
  setNodes: (nodes: NodeData[]) => void,
  setJitterConfig: (config: JitterConfig) => void,
): void => {
  try {
    const parsed = require("js-yaml").load(yamlContent) as YamlConfig;
    const nodes: NodeData[] = [];

    // Handle topologies
    if (parsed.topologies) {
      parsed.topologies.forEach((topology) => {
        const nodeIds: string[] = [];

        // Generate node IDs
        for (let i = 0; i < (topology.number_of_nodes || 0); i++) {
          nodeIds.push(`${topology.nid_prefix}${i}`);
        }

        // Create nodes
        const topologyNodes: NodeData[] = nodeIds.map((id) => ({
          id,
          program: topology.program,
          connections: [],
        }));

        // Create connections based on topology type
        switch (topology.type) {
          case "ring":
            nodeIds.forEach((id, index) => {
              const nextIndex = (index + 1) % nodeIds.length;
              const nextId = nodeIds[nextIndex];
              topologyNodes[index].connections = [nextId];
            });
            break;

          case "line":
            nodeIds.forEach((id, index) => {
              const connections: string[] = [];
              if (index > 0) connections.push(nodeIds[index - 1]);
              if (index < nodeIds.length - 1)
                connections.push(nodeIds[index + 1]);
              topologyNodes[index].connections = connections;
            });
            break;

          case "fully_connected":
            nodeIds.forEach((id, index) => {
              const connections = nodeIds.filter((_, i) => i !== index);
              topologyNodes[index].connections = connections;
            });
            break;
        }

        nodes.push(...topologyNodes);
      });
    }

    // Handle individual nodes
    if (parsed.individual_nodes) {
      parsed.individual_nodes.forEach((node) => {
        nodes.push({
          id: node.nid,
          program: node.program,
          connections: node.connections || [],
        });
      });
    }

    // handle jitter configs
    if (parsed.network_jitter_config) {
      setJitterConfig(parsed.network_jitter_config);
    }

    if (nodes.length > 0) {
      setNodes(nodes);
    }
  } catch (error) {
    console.error("Failed to parse YAML:", error);
  }
};

export const downloadYaml = (
  content: string,
  filename: string = "topology.yml",
) => {
  const blob = new Blob([content], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateJitterEnvVars = (config: JitterConfig): string => {
  return `DROP_RATE=${config.drop_rate}
DELAY_MS=${config.delay_ms}`;
};
