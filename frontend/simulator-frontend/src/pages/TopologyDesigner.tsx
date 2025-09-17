import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import NetworkVisualization from "../components/NetworkVisualization";
import TopologyPanel from "../components/TopologyPanel";
import { NodeData, JitterConfig } from "../types/topology";
import {
  generateYaml,
  parseYaml,
  downloadYaml,
} from "../utils/yamlGenerator";

const TopologyDesigner: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([
    {
      id: "node-0",
      program: "EchoAlgorithm",
      connections: ["node-1"],
    },
    {
      id: "node-1",
      program: "EchoAlgorithm",
      connections: ["node-0", "node-2"],
    },
    {
      id: "node-2",
      program: "EchoAlgorithm",
      connections: ["node-1"],
    },
  ]);

  const [jitterConfig, setJitterConfig] = useState<JitterConfig>({
    drop_rate: 0.0,
    delay_ms: 5000,
  });

  const [yamlOutput, setYamlOutput] = useState<string>("");

  const handleGenerateYaml = () => {
    let yamlContent = generateYaml(nodes, jitterConfig);
    setYamlOutput(yamlContent);
    downloadYaml(yamlContent);
  };

  const handleLoadYaml = (yamlContent: string) => {
    parseYaml(yamlContent, setNodes, setJitterConfig);
  };

  const saveTopologyToStorage = () => {
    const topology = {
      nodes,
      jitterConfig,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('currentTopology', JSON.stringify(topology));
  };

  const handleProceedToSimulation = () => {
    saveTopologyToStorage();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <header
        style={{
          background: "#282c34",
          padding: "20px",
          color: "white",
          textAlign: "center",
        }}
      >
        <h1>Distro - Topology Designer</h1>
        <p>Design network topologies and configure simulation parameters</p>
      </header>

      <div
        style={{
          display: "flex",
          height: "calc(100vh - 140px)",
          gap: "20px",
          padding: "20px",
        }}
      >
        {/* Left Panel - Configuration */}
        <div style={{ width: "350px", overflow: "auto" }}>
          <TopologyPanel
            nodes={nodes}
            onNodesChange={setNodes}
            jitterConfig={jitterConfig}
            onJitterConfigChange={setJitterConfig}
            onGenerateYaml={handleGenerateYaml}
            onLoadYaml={handleLoadYaml}
          />

          {/* Navigation to Simulation */}
          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <h4>Ready to Run Simulation?</h4>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
              Once you're satisfied with your topology design, proceed to the simulation runner.
            </p>
            <Link
              to="/simulation"
              onClick={handleProceedToSimulation}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 20px",
                background: "#007bff",
                color: "white",
                textDecoration: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Proceed to Simulation
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Right Panel - Visualization */}
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: "8px",
            padding: "20px",
            border: "1px solid #ddd",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3>Network Topology Visualization</h3>
            <div style={{ fontSize: "14px", color: "#666" }}>
              Nodes: {nodes.length} | Connections: {nodes.reduce((acc, node) => acc + node.connections.length, 0) / 2}
            </div>
          </div>
          <NetworkVisualization nodes={nodes} onNodesChange={setNodes} />

          {yamlOutput && (
            <div style={{ marginTop: "20px" }}>
              <h4>Generated YAML Configuration:</h4>
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: "15px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  overflow: "auto",
                  maxHeight: "200px",
                  border: "1px solid #ddd",
                }}
              >
                {yamlOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopologyDesigner;