import React, { useState } from "react";
import { Plus, Download, Upload, Trash2 } from "lucide-react";
import { NodeData, TopologyConfig, JitterConfig } from "../types/topology";

interface TopologyPanelProps {
  nodes: NodeData[];
  onNodesChange: (nodes: NodeData[]) => void;
  jitterConfig: JitterConfig;
  onJitterConfigChange: (config: JitterConfig) => void;
  onGenerateYaml: () => void;
  onLoadYaml: (yamlContent: string) => void;
}

const TopologyPanel: React.FC<TopologyPanelProps> = ({
  nodes,
  onNodesChange,
  jitterConfig,
  onJitterConfigChange,
  onGenerateYaml,
  onLoadYaml,
}) => {
  const [newNodeId, setNewNodeId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [topologyConfig, setTopologyConfig] = useState<TopologyConfig>({
    type: "ring",
    numberOfNodes: 3,
    program: "echo_algorithm",
    nidPrefix: "ring-node-",
  });
  
  // Keep track of next node counter for each topology type
  const [nodeCounters, setNodeCounters] = useState<Record<string, number>>({
    ring: 0,
    line: 0,
    fully_connected: 0,
  });

  const addNode = () => {
    setErrorMessage(""); // Clear previous error
    
    if (!newNodeId.trim()) {
      setErrorMessage("Node ID cannot be empty");
      return;
    }
    
    if (nodes.some((n) => n.id === newNodeId)) {
      setErrorMessage(`Node ID "${newNodeId}" already exists`);
      return;
    }
    
    const newNode: NodeData = {
      id: newNodeId,
      program: "echo_algorithm",
      connections: [],
    };
    onNodesChange([...nodes, newNode]);
    setNewNodeId("");
  };

  const clearAllNodes = () => {
    onNodesChange([]);
    // Reset all counters when clearing all nodes
    setNodeCounters({
      ring: 0,
      line: 0,
      fully_connected: 0,
    });
  };

  const generateTopology = () => {
    const currentCounter = nodeCounters[topologyConfig.type] || 0;
    const nodeIds: string[] = [];

    // Generate unique node IDs starting from the current counter
    for (let i = 0; i < (topologyConfig.numberOfNodes || 0); i++) {
      let newId = `${topologyConfig.type}-node-${currentCounter + i}`;
      
      // Ensure the ID is truly unique across all existing nodes
      while (nodes.some(n => n.id === newId)) {
        setNodeCounters(prev => ({
          ...prev,
          [topologyConfig.type]: prev[topologyConfig.type] + 1
        }));
        newId = `${topologyConfig.type}-node-${currentCounter + i + 1}`;
      }
      
      nodeIds.push(newId);
    }

    // Create nodes
    const newNodes: NodeData[] = nodeIds.map((id) => ({
      id,
      program: topologyConfig.program,
      connections: [],
    }));

    // Create connections based on topology type
    switch (topologyConfig.type) {
      case "ring":
        nodeIds.forEach((id, index) => {
          const nextIndex = (index + 1) % nodeIds.length;
          const nextId = nodeIds[nextIndex];
          newNodes[index].connections = [nextId];
        });
        break;

      case "line":
        nodeIds.forEach((id, index) => {
          const connections: string[] = [];
          if (index > 0) connections.push(nodeIds[index - 1]);
          if (index < nodeIds.length - 1) connections.push(nodeIds[index + 1]);
          newNodes[index].connections = connections;
        });
        break;

      case "fully_connected":
        nodeIds.forEach((id, index) => {
          const connections = nodeIds.filter((_, i) => i !== index);
          newNodes[index].connections = connections;
        });
        break;
    }

    // Update the counter for this topology type
    setNodeCounters({
      ...nodeCounters,
      [topologyConfig.type]: currentCounter + (topologyConfig.numberOfNodes || 0)
    });

    // Append to existing nodes instead of replacing
    onNodesChange([...nodes, ...newNodes]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onLoadYaml(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div
      style={{ padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}
    >
      <h3>Network Topology Configuration</h3>

      {/* Quick Topology Generation */}
      <div style={{ marginBottom: "20px" }}>
        <h4>Generate Topology</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label>Type:</label>
            <select
              value={topologyConfig.type}
              onChange={(e) => {
                const newType = e.target.value as any;
                setTopologyConfig({
                  ...topologyConfig,
                  type: newType,
                  nidPrefix: `${newType}-node-`,
                });
              }}
            >
              <option value="ring">Ring</option>
              <option value="line">Line</option>
              <option value="fully_connected">Fully Connected</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label>Nodes:</label>
            <input
              type="number"
              value={topologyConfig.numberOfNodes}
              onChange={(e) =>
                setTopologyConfig({
                  ...topologyConfig,
                  numberOfNodes: parseInt(e.target.value),
                })
              }
              min="2"
              max="20"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label>Program:</label>
            <select
              value={topologyConfig.program}
              onChange={(e) =>
                setTopologyConfig({
                  ...topologyConfig,
                  program: e.target.value,
                })
              }
            >
              <option value="echo_algorithm">Echo Algorithm</option>
              <option value="broadcast_algorithm">Broadcast Algorithm</option>
              <option value="leader_election">Leader Election</option>
              <option value="consensus_algorithm">Consensus Algorithm</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label>Prefix:</label>
            <input
              type="text"
              value={topologyConfig.nidPrefix}
              onChange={(e) =>
                setTopologyConfig({
                  ...topologyConfig,
                  nidPrefix: e.target.value,
                })
              }
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={generateTopology} style={{ padding: "8px 16px" }}>
              Generate Topology
            </button>
            <button
              onClick={clearAllNodes}
              style={{
                padding: "8px 16px",
                backgroundColor: "#ff4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Trash2 size={16} />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Manual Node Addition */}
      <div style={{ marginBottom: "20px" }}>
        <h4>Add Individual Node</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="Node ID"
              value={newNodeId}
              onChange={(e) => {
                setNewNodeId(e.target.value);
                setErrorMessage(""); // Clear error when typing
              }}
            />
            <button
              onClick={addNode}
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
            >
              <Plus size={16} />
              Add Node
            </button>
          </div>
          {errorMessage && (
            <div style={{ 
              color: "#ff4444", 
              fontSize: "14px", 
              fontWeight: "bold" 
            }}>
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Jitter Configuration */}
      <div style={{ marginBottom: "20px" }}>
        <h4>Network Jitter Configuration</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label>Drop Rate (%):</label>
            <input
              type="number"
              value={jitterConfig.dropRate * 100}
              onChange={(e) =>
                onJitterConfigChange({
                  ...jitterConfig,
                  dropRate: parseFloat(e.target.value) / 100,
                })
              }
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label>Delay (ms):</label>
            <input
              type="number"
              value={jitterConfig.delayMs}
              onChange={(e) =>
                onJitterConfigChange({
                  ...jitterConfig,
                  delayMs: parseInt(e.target.value),
                })
              }
              min="0"
              max="10000"
            />
          </div>
        </div>
      </div>

      {/* YAML Operations */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={onGenerateYaml}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "8px 16px",
          }}
        >
          <Download size={16} />
          Generate YAML
        </button>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "8px 16px",
            cursor: "pointer",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        >
          <Upload size={16} />
          Load YAML
          <input
            type="file"
            accept=".yml,.yaml"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <div style={{ marginTop: "20px" }}>
        <p>
          <strong>Current Nodes:</strong> {nodes.length}
        </p>
        <p>
          <strong>Total Connections:</strong>{" "}
          {nodes.reduce((sum, node) => sum + node.connections.length, 0) / 2}
        </p>
      </div>
    </div>
  );
};

export default TopologyPanel;

