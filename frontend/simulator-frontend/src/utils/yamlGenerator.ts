import { dump } from "js-yaml";
import { Component } from "lucide-react";
import {
  NodeData,
  YamlConfig,
  JitterConfig,
  TopologyConfig,
} from "../types/topology";
import { detectComponentTopology, findConnectedComponents } from "./graphUtils";

export const generateYamlFromNodes = (nodes: NodeData[]): string => {
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
            numberOfNodes: component.length,
            program: component[0].program,
            nidPrefix: topology + "-node-",
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

  return dump(config, { indent: 2 });
};

export const parseYamlToNodes = (yamlContent: string): NodeData[] => {
  try {
    const parsed = require("js-yaml").load(yamlContent) as YamlConfig;
    const nodes: NodeData[] = [];

    // Handle topologies
    if (parsed.topologies) {
      parsed.topologies.forEach((topology) => {
        const nodeIds: string[] = [];

        // Generate node IDs
        for (let i = 0; i < (topology.numberOfNodes || 0); i++) {
          nodeIds.push(`${topology.nidPrefix}${i}`);
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

    return nodes;
  } catch (error) {
    console.error("Failed to parse YAML:", error);
    return [];
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
  return `DROP_RATE=${config.dropRate}
DELAY_MS=${config.delayMs}`;
};

