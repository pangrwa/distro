import React, { useState } from "react";
import { Plus, Download, Upload, Trash2, X } from "lucide-react";
import CreatableSelect from "react-select/creatable";
import { components } from "react-select";
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
  const [newNodeProgram, setNewNodeProgram] = useState<{
    value: string;
    label: string;
  }>({
    value: "EchoAlgorithm",
    label: "EchoAlgorithm",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [algorithms, setAlgorithms] = useState<
    { value: string; label: string }[]
  >([{ value: "EchoAlgorithm", label: "EchoAlgorithm" }]);
  const [topologyConfig, setTopologyConfig] = useState<TopologyConfig>({
    type: "ring",
    number_of_nodes: 3,
    program: "EchoAlgorithm",
    nid_prefix: "ring-node-",
  });
  const [topologyProgram, setTopologyProgram] = useState<{
    value: string;
    label: string;
  }>({
    value: "EchoAlgorithm",
    label: "EchoAlgorithm",
  });

  // Keep track of next node counter for each topology type
  const [nodeCounters, setNodeCounters] = useState<Record<string, number>>({
    ring: 0,
    line: 0,
    fully_connected: 0,
  });

  // Custom option component with delete button
  const CustomOption = (props: any) => (
    <components.Option {...props}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <span>{props.label}</span>
        {props.data.value !== "EchoAlgorithm" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveAlgorithm(props.data);
            }}
            style={{
              padding: "2px 6px",
              backgroundColor: "#ff4444",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
    </components.Option>
  );

  // Handle creating new algorithm options
  const handleCreateAlgorithm = (inputValue: string) => {
    const newOption = { value: inputValue, label: inputValue };
    setAlgorithms([...algorithms, newOption]);
    setNewNodeProgram(newOption);
  };

  // Handle creating new algorithm options for topology generation
  const handleCreateTopologyAlgorithm = (inputValue: string) => {
    const newOption = { value: inputValue, label: inputValue };
    setAlgorithms([...algorithms, newOption]);
    setTopologyProgram(newOption);
    setTopologyConfig({
      ...topologyConfig,
      program: inputValue,
    });
  };

  // Handle removing an algorithm option
  const handleRemoveAlgorithm = (algo: { value: string; label: string }) => {
    setAlgorithms(algorithms.filter((a) => a.value !== algo.value));
    if (newNodeProgram.value === algo.value) {
      setNewNodeProgram(algorithms[0] || { value: "", label: "" });
    }
    if (topologyProgram.value === algo.value) {
      setTopologyProgram(algorithms[0] || { value: "", label: "" });
    }
  };

  const addNode = () => {
    setErrorMessage(""); // Clear previous error

    if (!newNodeId.trim()) {
      setErrorMessage("Node ID cannot be empty");
      return;
    }

    if (!newNodeProgram || !newNodeProgram.value) {
      setErrorMessage("Algorithm cannot be empty");
      return;
    }

    if (nodes.some((n) => n.id === newNodeId)) {
      setErrorMessage(`Node ID "${newNodeId}" already exists`);
      return;
    }

    const newNode: NodeData = {
      id: newNodeId,
      program: newNodeProgram.value,
      connections: [],
    };
    onNodesChange([...nodes, newNode]);
    setNewNodeId("");
    setNewNodeProgram(algorithms[0] || { value: "", label: "" });
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
    for (let i = 0; i < (topologyConfig.number_of_nodes || 0); i++) {
      let newId = `${topologyConfig.type}-node-${currentCounter + i}`;

      // Ensure the ID is truly unique across all existing nodes
      while (nodes.some((n) => n.id === newId)) {
        setNodeCounters((prev) => ({
          ...prev,
          [topologyConfig.type]: prev[topologyConfig.type] + 1,
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
          const prevIndex = (index - 1 + nodeIds.length) % nodeIds.length;
          const nextId = nodeIds[nextIndex];
          const prevId = nodeIds[prevIndex];
          newNodes[index].connections = [prevId, nextId];
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
      [topologyConfig.type]:
        currentCounter + (topologyConfig.number_of_nodes || 0),
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
                  nid_prefix: `${newType}-node-`,
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
              value={topologyConfig.number_of_nodes}
              onChange={(e) =>
                setTopologyConfig({
                  ...topologyConfig,
                  number_of_nodes: parseInt(e.target.value),
                })
              }
              min="2"
              max="20"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label style={{ whiteSpace: "nowrap" }}>Program:</label>
            <CreatableSelect
              value={topologyProgram}
              onChange={(option) => {
                if (option) {
                  setTopologyProgram(option);
                  setTopologyConfig({
                    ...topologyConfig,
                    program: option.value,
                  });
                }
              }}
              onCreateOption={handleCreateTopologyAlgorithm}
              options={algorithms}
              isClearable={false}
              placeholder="Select or create algorithm"
              components={{ Option: CustomOption }}
              styles={{
                container: (base) => ({
                  ...base,
                  flex: 1,
                  minWidth: "100px",
                }),
                control: (base) => ({
                  ...base,
                  minHeight: "32px",
                  height: "32px",
                  fontSize: "14px",
                }),
                option: (base) => ({
                  ...base,
                  padding: "8px 12px",
                  fontSize: "14px",
                }),
                menuList: (base) => ({
                  ...base,
                  maxHeight: "150px",
                }),
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label>Prefix:</label>
            <input
              type="text"
              value={topologyConfig.nid_prefix}
              onChange={(e) =>
                setTopologyConfig({
                  ...topologyConfig,
                  nid_prefix: e.target.value,
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
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            type="text"
            placeholder="Node ID"
            value={newNodeId}
            onChange={(e) => {
              setNewNodeId(e.target.value);
              setErrorMessage(""); // Clear error when typing
            }}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <CreatableSelect
              value={newNodeProgram}
              onChange={(option) => {
                if (option) {
                  setNewNodeProgram(option);
                  setErrorMessage("");
                }
              }}
              onCreateOption={handleCreateAlgorithm}
              options={algorithms}
              isClearable={false}
              placeholder="Select or create algorithm"
              components={{ Option: CustomOption }}
              styles={{
                container: (base) => ({
                  ...base,
                  flex: 1,
                  minWidth: "100px",
                }),
                control: (base) => ({
                  ...base,
                  minHeight: "32px",
                  height: "32px",
                  fontSize: "14px",
                }),
                option: (base) => ({
                  ...base,
                  padding: "8px 12px",
                  fontSize: "14px",
                }),
                menuList: (base) => ({
                  ...base,
                  maxHeight: "150px",
                }),
              }}
            />
            <button
              onClick={addNode}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={16} />
              Add
            </button>
          </div>
          {errorMessage && (
            <div
              style={{
                color: "#ff4444",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
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
              value={jitterConfig.drop_rate * 100}
              onChange={(e) =>
                onJitterConfigChange({
                  ...jitterConfig,
                  drop_rate: parseFloat(e.target.value) / 100,
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
              value={jitterConfig.delay_ms}
              onChange={(e) =>
                onJitterConfigChange({
                  ...jitterConfig,
                  delay_ms: parseInt(e.target.value),
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

      {/*
      <div style={{ marginTop: "20px" }}>
        <p>
          <strong>Current Nodes:</strong> {nodes.length}
        </p>
        <p>
          <strong>Total Connections:</strong>{" "}
          {nodes.reduce((sum, node) => sum + node.connections.length, 0) / 2}
        </p>
      </div>
      */}
    </div>
  );
};

export default TopologyPanel;
