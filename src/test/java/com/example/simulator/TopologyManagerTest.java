package com.example.simulator;

import static org.junit.Assert.*;
import org.junit.Before;
import org.junit.Test;

import com.example.model.NodeConfig;
import java.io.File;
import java.util.Map;

public class TopologyManagerTest {
    
    private final String TEST_RESOURCES = "src/test/resources/";
    
    @Test
    public void testLoadRingTopology() throws Exception {
        TopologyManager manager = new TopologyManager(TEST_RESOURCES + "test-topology-ring.yml");
        Map<String, NodeConfig> nodes = manager.getNodes();
        
        // Verify number of nodes
        assertEquals(5, nodes.size());
        
        // Verify node connections (each has 2 connections in a ring)
        assertEquals(2, nodes.get("ring-node-0").getPeerNodeIds().size());
        assertEquals(2, nodes.get("ring-node-1").getPeerNodeIds().size());
        
        // Verify bidirectional connections
        assertTrue(nodes.get("ring-node-0").getPeerNodeIds().contains("ring-node-4"));
        assertTrue(nodes.get("ring-node-0").getPeerNodeIds().contains("ring-node-1"));
        assertTrue(nodes.get("ring-node-1").getPeerNodeIds().contains("ring-node-0"));
    }
    
    @Test
    public void testLoadLineTopology() throws Exception {
        TopologyManager manager = new TopologyManager(TEST_RESOURCES + "test-topology-line.yml");
        Map<String, NodeConfig> nodes = manager.getNodes();
        
        // Verify endpoints have only one connection
        assertEquals(1, nodes.get("line-node-0").getPeerNodeIds().size());
        assertEquals(1, nodes.get("line-node-4").getPeerNodeIds().size());
        
        // Verify middle nodes have two connections
        assertEquals(2, nodes.get("line-node-2").getPeerNodeIds().size());
    }
    
    @Test
    public void testLoadFullyConnectedTopology() throws Exception {
        TopologyManager manager = new TopologyManager(TEST_RESOURCES + "test-topology-fully-connected.yml");
        Map<String, NodeConfig> nodes = manager.getNodes();
        
        // Verify all nodes are connected to all other nodes
        assertEquals(3, nodes.get("fc-node-0").getPeerNodeIds().size());
        assertEquals(3, nodes.get("fc-node-1").getPeerNodeIds().size());
        assertEquals(3, nodes.get("fc-node-2").getPeerNodeIds().size());
        assertEquals(3, nodes.get("fc-node-3").getPeerNodeIds().size());
    }
    
    @Test
    public void testLoadMixedTopology() throws Exception {
        TopologyManager manager = new TopologyManager(TEST_RESOURCES + "test-topology-mixed.yml");
        Map<String, NodeConfig> nodes = manager.getNodes();
        
        // Verify individual node connections
        assertTrue(nodes.get("coordinator").getPeerNodeIds().contains("ring-node-0"));
        assertTrue(nodes.get("coordinator").getPeerNodeIds().contains("fc-node-0"));
        
        // Verify program assignments
        assertEquals("consensus_algorithm", nodes.get("coordinator").getProgramName());
        assertEquals("broadcast_algorithm", nodes.get("ring-node-0").getProgramName());
        assertEquals("leader_election", nodes.get("fc-node-0").getProgramName());
    }
    
    @Test(expected = Exception.class)
    public void testInvalidTopology() throws Exception {
        // This should throw an exception due to invalid topology
        new TopologyManager(TEST_RESOURCES + "test-topology-invalid.yml");
    }
}
