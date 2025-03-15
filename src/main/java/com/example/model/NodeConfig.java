package com.example.model;

import java.util.List;

public class NodeConfig {
    private String nodeId;
    private String programName;
    private List<String> peerNodeIds;

    public NodeConfig(String nodeId, String programName, List<String> peerNodeIds) {
        this.nodeId = nodeId;
        this.programName = programName;
        this.peerNodeIds = peerNodeIds;
    }

    public String getNodeId() {
        return nodeId;
    }

    public String getProgramName() {
        return programName;
    }

    public List<String> getPeerNodeIds() {
        return peerNodeIds;
    }
}
