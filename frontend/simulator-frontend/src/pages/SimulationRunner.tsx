import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import SimulationMonitor from "../components/SimulationMonitor";
import TopologyDisplay from "../components/TopologyDisplay";
import { NodeData, JitterConfig } from "../types/topology";

const SimulationRunner: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [jitterConfig, setJitterConfig] = useState<JitterConfig>({
    drop_rate: 0.0,
    delay_ms: 5000,
  });
  const [topologyLoaded, setTopologyLoaded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    loadTopologyFromStorage();
  }, []);

  const loadTopologyFromStorage = () => {
    try {
      const savedTopology = localStorage.getItem("currentTopology");
      if (savedTopology) {
        const topology = JSON.parse(savedTopology);
        setNodes(topology.nodes || []);
        setJitterConfig(
          topology.jitterConfig || { drop_rate: 0.0, delay_ms: 5000 },
        );
        setTopologyLoaded(true);
      }
    } catch (error) {
      console.error("Failed to load topology from storage:", error);
    }
  };

  const clearTopology = () => {
    setNodes([]);
    setJitterConfig({ drop_rate: 0.0, delay_ms: 5000 });
    setTopologyLoaded(false);
    setSelectedNodeId(undefined);
    localStorage.removeItem("currentTopology");
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(selectedNodeId === nodeId ? undefined : nodeId);
  };

  const handleBackToGlobal = () => {
    setSelectedNodeId(undefined);
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
        <h1>Distro - Simulation Runner</h1>
        <p>Run and monitor distributed system simulations</p>
      </header>

      <div style={{ padding: "20px" }}>
        {/* Navigation Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            padding: "15px 20px",
            background: "white",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        >
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: "#6c757d",
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <ArrowLeft size={16} />
            Back to Designer
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {topologyLoaded && (
              <div style={{ fontSize: "14px", color: "#28a745" }}>
                ✓ Topology loaded ({nodes.length} nodes)
              </div>
            )}
            <button
              onClick={loadTopologyFromStorage}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                background: "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              <RefreshCw size={14} />
              Reload
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        {topologyLoaded ? (
          <div
            style={{
              display: "flex",
              gap: "20px",
              height: "calc(100vh - 200px)",
            }}
          >
            {/* Left Panel - Simulation Monitor */}
            <div style={{ width: "400px", overflow: "auto" }}>
              <SimulationMonitor
                nodes={nodes}
                jitterConfig={jitterConfig}
                selectedNodeId={selectedNodeId}
                onBackToGlobal={handleBackToGlobal}
              />
            </div>

            {/* Right Panel - Topology Visualization */}
            <div
              style={{
                flex: 1,
                background: "white",
                borderRadius: "8px",
                border: "1px solid #ddd",
                padding: "20px",
                overflow: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h3>Current Topology Visualization</h3>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    Nodes: {nodes.length} | Connections:{" "}
                    {nodes.reduce(
                      (acc, node) => acc + node.connections.length,
                      0,
                    ) / 2}
                  </div>
                  <button
                    onClick={clearTopology}
                    style={{
                      padding: "8px 12px",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Clear Configuration
                  </button>
                </div>
              </div>

              {/* Topology Display */}
              <div style={{ height: "calc(100% - 80px)", minHeight: "400px" }}>
                <TopologyDisplay
                  nodes={nodes}
                  selectedNodeId={selectedNodeId}
                  onNodeClick={handleNodeClick}
                />
              </div>

              {/* Configuration Summary */}
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "4px",
                }}
              >
                <h4 style={{ marginBottom: "10px", color: "#333" }}>
                  Jitter Configuration
                </h4>
                <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
                  <div>
                    <strong>Drop Rate:</strong>{" "}
                    {(jitterConfig.drop_rate * 100).toFixed(1)}%
                  </div>
                  <div>
                    <strong>Delay:</strong> {jitterConfig.delay_ms}ms
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginBottom: "20px",
              padding: "30px",
              background: "white",
              borderRadius: "8px",
              border: "2px dashed #ddd",
              textAlign: "center",
            }}
          >
            <h3 style={{ color: "#666", marginBottom: "15px" }}>
              No Topology Configuration Found
            </h3>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              You need to design a topology first before running simulations.
            </p>
            <Link
              to="/"
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
              <ArrowLeft size={16} />
              Go to Topology Designer
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationRunner;

