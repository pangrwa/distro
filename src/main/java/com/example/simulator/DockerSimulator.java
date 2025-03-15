package com.example.simulator;

import java.util.HashMap;
import java.util.Map;

import com.example.model.NodeConfig;

public class DockerSimulator {
    
    private TopologyManager topologyManager;
    private DockerManager dockerManager;
    private Map<String, String> nodeContainerIds = new HashMap<>();

    public DockerSimulator(String yamlPath) throws Exception {
        dockerManager = new DockerManager();
        topologyManager = new TopologyManager(yamlPath);

        System.out.println("Initialised simulator with topology from: " + yamlPath);
    }

    public void startSimulation() {
        Map<String, NodeConfig> nodes = topologyManager.getNodes();

        System.out.println("Starting simulation with " + nodes.size() + " nodes");

        // create docker containers for each of these nodes
        for (Map.Entry<String, NodeConfig> entry : nodes.entrySet()) {
            String nodeId = entry.getKey();
            NodeConfig config = entry.getValue();

            String programName = config.getProgramName();

            String containerId = dockerManager.createNodeContainer(nodeId, programName, config.getPeerNodeIds());

            nodeContainerIds.put(nodeId, containerId);
        }

        System.out.println("Simulation started successfully");
    }

    public void pauseNode(String nodeId) {
        dockerManager.pauseNode(nodeId);
    }

    public void resumeNode(String nodeId) {
        dockerManager.resumeNode(nodeId);
    }

    public void stopNode(String nodeId) {
        dockerManager.stopNode(nodeId);
    }

    public void shutdown() {
        System.out.println("Shutting down simulation...");
        dockerManager.cleanupContainers();
        System.out.println("Simulation shutdown complete");
    }

}
