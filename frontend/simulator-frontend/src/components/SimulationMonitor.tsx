import React, { useState, useEffect, useRef } from "react";
import { Play, Square, Wifi, WifiOff, Trash2 } from "lucide-react";
import { NodeData, JitterConfig } from "../types/topology";
import { generateYaml } from "../utils/yamlGenerator";
import TopologyDisplay from "./TopologyDisplay";

interface SimulationMonitorProps {
  nodes: NodeData[];
  jitterConfig: JitterConfig;
}

interface Message {
  id: string;
  timestamp: string;
  content: string;
}

const SimulationMonitor: React.FC<SimulationMonitorProps> = ({
  nodes,
  jitterConfig,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [simulationStatus, setSimulationStatus] = useState("");

  const wsRef = useRef<WebSocket | null>(null);

  const idRef = useRef(0);

  // Connect to WebSocket
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.hostname}:8080/ws/simulation`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      addMessage("WebSocket connection established");
    };

    wsRef.current.onmessage = (event) => {
      addMessage(`Received: ${event.data}`);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      addMessage("WebSocket connection closed");

      // Try to reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    wsRef.current.onerror = (error) => {
      addMessage(`WebSocket error: ${error}`);
    };
  };

  const addMessage = (content: string) => {
    const message: Message = {
      id: idRef.current.toString(),
      timestamp: new Date().toLocaleTimeString(),
      content,
    };
    idRef.current += 1;
    setMessages((prev) => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const generateTopologyFile = () => {
    const yamlContent = generateYaml(nodes, jitterConfig);
    const blob = new Blob([yamlContent], { type: "text/yaml" });
    const file = new File([blob], "topology.yaml", { type: "text/yaml" });
    addMessage("Generated topology file from current configuration");

    return file;
  };

  const startSimulation = async () => {
    try {
      setSimulationStatus("Starting simulation...");
      const file = generateTopologyFile();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://localhost:8080/api/simulation/start",
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.text();

      console.log(result);

      if (response.ok) {
        setIsSimulationRunning(true);
        setSimulationStatus("Simulation started successfully");
        addMessage(`Simulation started: ${result}`);
      } else {
        setSimulationStatus("Failed to start simulation");
        addMessage(`Error starting simulation: ${result}`);
      }
    } catch (error) {
      setSimulationStatus("Error starting simulation");
      addMessage(`Error starting simulation: ${error}`);
    }
  };

  const stopSimulation = async () => {
    try {
      setSimulationStatus("Stopping simulation...");

      const response = await fetch(
        "http://localhost:8080/api/simulation/stop",
        {
          method: "POST",
        },
      );

      const result = await response.text();

      if (response.ok) {
        setIsSimulationRunning(false);
        setSimulationStatus("Simulation stopped");
        addMessage(`Simulation stopped: ${result}`);
      } else {
        setSimulationStatus("Failed to stop simulation");
        addMessage(`Error stopping simulation: ${result}`);
      }
    } catch (error) {
      setSimulationStatus("Error stopping simulation");
      addMessage(`Error stopping simulation: ${error}`);
    }
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        border: "1px solid #ddd",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ padding: "15px", borderBottom: "1px solid #eee" }}>
        <h3 style={{ margin: 0, fontSize: "18px" }}>Simulation Monitor</h3>
      </div>

      <div style={{ flex: 1, padding: "15px", overflow: "auto" }}>
        {/* Current Topology */}
        {/*
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>Current Topology</h4>
          <div style={{ height: "200px" }}>
            <TopologyDisplay nodes={nodes} />
          </div>
        </div>
        */}

        {/* Connection Status */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px",
              borderRadius: "4px",
              background: isConnected ? "#d4edda" : "#f8d7da",
              border: `1px solid ${isConnected ? "#c3e6cb" : "#f5c6cb"}`,
              color: isConnected ? "#155724" : "#721c24",
              fontSize: "14px",
            }}
          >
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            WebSocket: {isConnected ? "Connected" : "Disconnected"}
          </div>
        </div>

        {/* Simulation Controls */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>
            Controls
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={startSimulation}
              disabled={!isConnected || isSimulationRunning}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 15px",
                background:
                  !isConnected || isSimulationRunning ? "#ccc" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor:
                  !isConnected || isSimulationRunning
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
              }}
            >
              <Play size={16} />
              Start Simulation
            </button>

            <button
              onClick={stopSimulation}
              disabled={!isConnected || !isSimulationRunning}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 15px",
                background:
                  !isConnected || !isSimulationRunning ? "#ccc" : "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor:
                  !isConnected || !isSimulationRunning
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
              }}
            >
              <Square size={16} />
              Stop Simulation
            </button>
          </div>

          {simulationStatus && (
            <div
              style={{
                marginTop: "10px",
                padding: "8px",
                borderRadius: "4px",
                background:
                  simulationStatus.includes("Error") ||
                  simulationStatus.includes("Failed")
                    ? "#f8d7da"
                    : simulationStatus.includes("successfully") ||
                        simulationStatus.includes("stopped")
                      ? "#d4edda"
                      : "#fff3cd",
                border: `1px solid ${
                  simulationStatus.includes("Error") ||
                  simulationStatus.includes("Failed")
                    ? "#f5c6cb"
                    : simulationStatus.includes("successfully") ||
                        simulationStatus.includes("stopped")
                      ? "#c3e6cb"
                      : "#ffeaa7"
                }`,
                color:
                  simulationStatus.includes("Error") ||
                  simulationStatus.includes("Failed")
                    ? "#721c24"
                    : simulationStatus.includes("successfully") ||
                        simulationStatus.includes("stopped")
                      ? "#155724"
                      : "#856404",
                fontSize: "12px",
              }}
            >
              {simulationStatus}
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h4 style={{ margin: 0, fontSize: "14px", color: "#666" }}>
              Messages
            </h4>
            <button
              onClick={clearMessages}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              <Trash2 size={10} />
              Clear
            </button>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: "200px",
              overflowY: "auto",
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: "#fafafa",
              padding: "8px",
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{ color: "#666", fontStyle: "italic", fontSize: "12px" }}
              >
                No messages yet. Connect to WebSocket and start simulation to
                see messages.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    marginBottom: "6px",
                    padding: "6px",
                    background: "white",
                    borderRadius: "3px",
                    borderLeft: "2px solid #007bff",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#666",
                      marginBottom: "2px",
                    }}
                  >
                    {message.timestamp}
                  </div>
                  <div style={{ fontSize: "11px", fontFamily: "monospace" }}>
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationMonitor;
