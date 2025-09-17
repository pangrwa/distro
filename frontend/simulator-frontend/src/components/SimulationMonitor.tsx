import React, { useState, useEffect, useRef } from "react";
import { Play, Square, Wifi, WifiOff, Upload, Trash2 } from "lucide-react";
import { NodeData, JitterConfig } from "../types/topology";
import { generateYaml } from "../utils/yamlGenerator";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  let id = 0;

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
      id: id.toString(),
      timestamp: new Date().toLocaleTimeString(),
      content,
    };
    id += 1;
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
      style={{ padding: "20px", background: "#f9f9f9", borderRadius: "8px" }}
    >
      <h3>Simulation Monitor</h3>

      {/* Connection Status */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px",
            borderRadius: "4px",
            background: isConnected ? "#d4edda" : "#f8d7da",
            border: `1px solid ${isConnected ? "#c3e6cb" : "#f5c6cb"}`,
            color: isConnected ? "#155724" : "#721c24",
          }}
        >
          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          WebSocket: {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* Simulation Controls */}
      <div style={{ marginBottom: "20px" }}>
        <h4>Simulation Controls</h4>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <button
            onClick={startSimulation}
            disabled={!isConnected || isSimulationRunning}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 15px",
              background:
                !isConnected || isSimulationRunning ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                !isConnected || isSimulationRunning ? "not-allowed" : "pointer",
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
            }}
          >
            <Square size={16} />
            Stop Simulation
          </button>
        </div>

        {simulationStatus && (
          <div
            style={{
              padding: "10px",
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
              fontSize: "14px",
            }}
          >
            {simulationStatus}
          </div>
        )}
      </div>

      {/* Messages */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <h4>Messages</h4>
          <button
            onClick={clearMessages}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 10px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            <Trash2 size={12} />
            Clear
          </button>
        </div>

        <div
          style={{
            height: "300px",
            overflowY: "auto",
            border: "1px solid #ddd",
            borderRadius: "4px",
            background: "white",
            padding: "10px",
          }}
        >
          {messages.length === 0 ? (
            <div style={{ color: "#666", fontStyle: "italic" }}>
              No messages yet. Connect to WebSocket and start simulation to see
              messages.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                style={{
                  marginBottom: "8px",
                  padding: "8px",
                  background: "#f8f9fa",
                  borderRadius: "4px",
                  borderLeft: "3px solid #007bff",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#666",
                    marginBottom: "4px",
                  }}
                >
                  {message.timestamp}
                </div>
                <div style={{ fontSize: "13px", fontFamily: "monospace" }}>
                  {message.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationMonitor;

