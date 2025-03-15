package com.example.model;

public class Connection {
    private final String fromNode;
    private final String toNode;

    public Connection(String fromNode, String toNode) {
        this.fromNode = fromNode;
        this.toNode = toNode;
    }

    public String getFromNode() {
        return fromNode; 
    }

    public String getToNode() {
        return toNode;
    }
}
