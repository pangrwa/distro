import React, { useState } from "react";
import "./App.css";
import NetworkVisualization from "./components/NetworkVisualization";
import TopologyPanel from "./components/TopologyPanel";
import SimulationRunner from "./components/SimulationRunner";
import { NodeData, JitterConfig } from "./types/topology";
import {
  generateYaml,
  parseYaml,
  downloadYaml,
  generateJitterEnvVars,
} from "./utils/yamlGenerator";

function App() {
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

  return (
    <div className="App">
      <header
        style={{
          background: "#282c34",
          padding: "20px",
          color: "white",
          textAlign: "center",
        }}
      >
        <h1>Distro</h1>
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

          {/*<SimulationRunner nodes={nodes} jitterConfig={jitterConfig} />*/}
        </div>

        {/* Right Panel - Visualization */}
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <h3>Network Topology Visualization</h3>
          <NetworkVisualization nodes={nodes} onNodesChange={setNodes} />

          {/*
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
                }}
              >
                {yamlOutput}
              </pre>
            </div>
          )}
          */}
        </div>
      </div>
    </div>
  );
}

export default App;
