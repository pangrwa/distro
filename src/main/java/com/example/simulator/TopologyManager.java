package com.example.simulator;

import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.yaml.snakeyaml.Yaml;

import com.example.model.NodeConfig;
import com.example.model.Connection;

public class TopologyManager {
  private Map<String, NodeConfig> nodes = new HashMap<>();
  private Set<Connection> connections = new HashSet<>();
  private Map<String, Integer> idTracker = new HashMap<>();

  public TopologyManager(String yamlPath) throws Exception {
    loadTopologyFromYaml(yamlPath);
  }

  private void loadTopologyFromYaml(String yamlPath) throws Exception {
    // Load yaml file
    Yaml yaml = new Yaml();
    Map<String, Object> config;

    try (FileInputStream fileInputStream = new FileInputStream(yamlPath)) {
      config = yaml.load(fileInputStream);
    }

    if (config.containsKey("topologies")) {
      loadTopologies(config);
    }

    if (config.containsKey("individual_nodes")) {
      loadIndividualNodes(config);
    }

    establishConnections();
  }

  @SuppressWarnings("unchecked")
  private void loadTopologies(Map<String, Object> config) {
    List<Map<String, Object>> topologies = (List<Map<String, Object>>) config.get("topologies");

    for (Map<String, Object> topology : topologies) {
      String type = (String) topology.get("type");
      int numberOfNodes = ((Number) topology.get("number_nodes")).intValue();
      String programName = (String) topology.get("program");
      String nidPrefix = (String) topology.get("nid_prefix");

      createTopology(type, numberOfNodes, programName, nidPrefix);
    }
  }

  private void createTopology(String type, int numberOfNodes, String programName, String nidPrefix) {
    List<String> nodeIds = new ArrayList<>();

    // Create nodes
    for (int i = 0; i < numberOfNodes; i++) {
      String nodeId = String.valueOf(idTracker.getOrDefault(nidPrefix, 0) + i);
      nodeIds.add(nodeId);
      nodes.put(nodeId, new NodeConfig(nodeId, programName, new ArrayList<>()));
    }

    idTracker.put(nidPrefix, idTracker.getOrDefault(nidPrefix, 0) + numberOfNodes);

    // Connect nodes based on topology type
    switch (type) {
      case "ring":
        createRingConnections(nodeIds);
        break;
      case "line":
        createLineConnections(nodeIds);
        break;
      case "fully_connected":
        createFullyConnectedTopology(nodeIds);
        break;
      default:
        throw new IllegalArgumentException("Unsupported topology type: " + type);
    }
  }

  private void createRingConnections(List<String> nodeIds) {
    for (int i = 0; i < nodeIds.size(); ++i) {
      String current = nodeIds.get(i);
      String next = nodeIds.get((i + 1) % nodeIds.size());
      connections.add(new Connection(current, next));
    }
  }

  private void createLineConnections(List<String> nodeIds) {
    for (int i = 0; i < nodeIds.size() - 1; ++i) {
      String current = nodeIds.get(i);
      String next = nodeIds.get(i + 1);
      connections.add(new Connection(current, next));
    }
  }

  private void createFullyConnectedTopology(List<String> nodeIds) {
    for (int i = 0; i < nodeIds.size(); ++i) {
      for (int j = i + 1; j < nodeIds.size(); ++j) {
        String node1 = nodeIds.get(i);
        String node2 = nodeIds.get(j);
        connections.add(new Connection(node1, node2));
      }
    }
  }

  @SuppressWarnings("unchecked")
  private void loadIndividualNodes(Map<String, Object> config) {
    List<Map<String, Object>> individualNodes = (List<Map<String, Object>>) config.get("individual_nodes");

    for (Map<String, Object> nodeConfig : individualNodes) {
      String nid = (String) nodeConfig.get("nid");
      String programName = (String) nodeConfig.get("program");
      List<String> nodeConnections = (List<String>) nodeConfig.get("connections");

      // Create the node with empty peer list (we'll populate it later)
      nodes.put(nid, new NodeConfig(nid, programName, new ArrayList<>()));

      // Add connections
      if (nodeConnections != null) {
        for (String targetNid : nodeConnections) {
          connections.add(new Connection(nid, targetNid));
        }
      }
    }
  }

  /**
   * This method defines each peer nodes within each NodeConfig object
   */
  private void establishConnections() {
    // Process all connections to create the peer lists for each node
    Map<String, List<String>> peerLists = new HashMap<>();

    // Initialize empty peer lists
    for (String nodeId : nodes.keySet()) {
      peerLists.put(nodeId, new ArrayList<>());
    }

    // Add peers based on connections
    for (Connection connection : connections) {
      String from = connection.getFromNode();
      String to = connection.getToNode();

      // Add bidirectional connections
      if (nodes.containsKey(from) && nodes.containsKey(to)) {
        peerLists.get(from).add(to);
        peerLists.get(to).add(from);
      }
    }

    // Update peer lists for each node
    for (Map.Entry<String, List<String>> entry : peerLists.entrySet()) {
      String nodeId = entry.getKey();
      List<String> peers = entry.getValue();

      // Create a new NodeConfig with updated peer list
      NodeConfig oldConfig = nodes.get(nodeId);
      nodes.put(nodeId, new NodeConfig(nodeId, oldConfig.getProgramName(), peers));
    }
  }

  public Map<String, NodeConfig> getNodes() {
    return nodes;
  }

  public Set<Connection> getConnections() {
    return connections;
  }

}

/*
 * Example of the yaml file
 * topologies:
 * - type: "ring"
 * number_nodes: 3
 * program: "broadcast_algorithm"
 * nid_prefix: "ring-node-"
 * 
 * - type: "fully_connected"
 * number_nodes: 2
 * program: "leader_election"
 * nid_prefix: "fc-node-"
 * 
 * Let us assume that we don't require the user to specify the edges and that we
 * respect the topology form
 * 
 * individual_nodes:
 * - nid: "coordinator"
 * program: "consensus_algorithm"
 * connections:
 * - "ring-node-0"
 * - "fc-node-0"
 * 
 */
