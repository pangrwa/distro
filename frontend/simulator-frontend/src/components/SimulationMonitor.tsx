import React, { useState, useEffect, useRef } from "react";
import { Play, Square, Wifi, WifiOff, Trash2, Home } from "lucide-react";
import { NodeData, JitterConfig } from "../types/topology";
import { generateYaml } from "../utils/yamlGenerator";

interface SimulationMonitorProps {
  nodes: NodeData[];
  jitterConfig: JitterConfig;
  selectedNodeId?: string;
  onBackToGlobal?: () => void;
  onMessageAnimation?: (fromNode: string, toNode: string) => void;
}

interface Message {
  id: string;
  timestamp: string;
  content: string;
}

interface NodeMessages {
  [nodeId: string]: Message[];
}

const SimulationMonitor: React.FC<SimulationMonitorProps> = ({
  nodes,
  jitterConfig,
  selectedNodeId,
  onBackToGlobal,
  onMessageAnimation,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [globalMessages, setGlobalMessages] = useState<Message[]>([]);
  const [nodeMessages, setNodeMessages] = useState<NodeMessages>({});
  const [simulationStatus, setSimulationStatus] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const idRef = useRef(0);
  const MAX_MESSAGES_PER_NODE = 30;

  // Function to add message to a specific node's inbox with limit
  const addMessageToNode = (nodeId: string, content: string) => {
    const message: Message = {
      id: idRef.current.toString(),
      timestamp: new Date().toLocaleTimeString(),
      content,
    };
    idRef.current += 1;

    setNodeMessages(prev => {
      const currentMessages = prev[nodeId] || [];
      const updatedMessages = [...currentMessages, message];

      // Keep only the latest 30 messages
      const limitedMessages = updatedMessages.slice(-MAX_MESSAGES_PER_NODE);

      return {
        ...prev,
        [nodeId]: limitedMessages
      };
    });
  };

  // Function to add global message (system messages)
  const addGlobalMessage = (content: string) => {
    const message: Message = {
      id: idRef.current.toString(),
      timestamp: new Date().toLocaleTimeString(),
      content,
    };
    idRef.current += 1;

    setGlobalMessages(prev => {
      const updatedMessages = [...prev, message];
      // Keep only the latest 50 global messages
      return updatedMessages.slice(-50);
    });
  };

  // Function to parse and distribute received messages
  const parseAndDistributeMessage = (content: string) => {
    try {
      // Check if this is a received message with JSON content
      if (content.startsWith('Received: ')) {
        const jsonStr = content.substring('Received: '.length);
        const messageData = JSON.parse(jsonStr);

        // Trigger animation if we have fromNode and toNode
        if (messageData.fromNode && messageData.toNode && onMessageAnimation) {
          onMessageAnimation(messageData.fromNode, messageData.toNode);
        }

        // Add to both fromNode and toNode inboxes
        if (messageData.fromNode) {
          addMessageToNode(messageData.fromNode, content);
        }
        if (messageData.toNode && messageData.toNode !== messageData.fromNode) {
          addMessageToNode(messageData.toNode, content);
        }
      } else {
        // System messages go to global inbox
        addGlobalMessage(content);
      }
    } catch (error) {
      // If parsing fails, treat as global message
      addGlobalMessage(content);
    }
  };

  // Get messages to display based on selected node
  const getMessagesToDisplay = (): Message[] => {
    if (selectedNodeId && nodeMessages[selectedNodeId]) {
      return nodeMessages[selectedNodeId];
    }
    return globalMessages;
  };

  // Cleanup WebSocket on unmount
  useEffect(() => {
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
      addGlobalMessage("WebSocket connection established");
    };

    wsRef.current.onmessage = (event) => {
      parseAndDistributeMessage(`Received: ${event.data}`);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      addGlobalMessage("WebSocket connection closed");
    };

    wsRef.current.onerror = (error) => {
      addGlobalMessage(`WebSocket error: ${error}`);
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      addGlobalMessage("WebSocket disconnected by user");
    }
  };


  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [globalMessages, nodeMessages, selectedNodeId]);

  const clearMessages = () => {
    if (selectedNodeId) {
      // Clear only the selected node's messages
      setNodeMessages(prev => ({
        ...prev,
        [selectedNodeId]: []
      }));
    } else {
      // Clear global messages when no node is selected
      setGlobalMessages([]);
    }
  };

  const generateTopologyFile = () => {
    const yamlContent = generateYaml(nodes, jitterConfig);
    const blob = new Blob([yamlContent], { type: "text/yaml" });
    const file = new File([blob], "topology.yaml", { type: "text/yaml" });
    addGlobalMessage("Generated topology file from current configuration");

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
        addGlobalMessage(`Simulation started: ${result}`);

        // Set all nodes to running status
        if ((window as any).__setAllNodesToRunning) {
          (window as any).__setAllNodesToRunning();
        }
      } else {
        setSimulationStatus("Failed to start simulation");
        addGlobalMessage(`Error starting simulation: ${result}`);
      }
    } catch (error) {
      setSimulationStatus("Error starting simulation");
      addGlobalMessage(`Error starting simulation: ${error}`);
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
        addGlobalMessage(`Simulation stopped: ${result}`);

        // Close WebSocket connection
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
          setIsConnected(false);
          addGlobalMessage("WebSocket connection closed");
        }
      } else {
        setSimulationStatus("Failed to stop simulation");
        addGlobalMessage(`Error stopping simulation: ${result}`);
      }
    } catch (error) {
      setSimulationStatus("Error stopping simulation");
      addGlobalMessage(`Error stopping simulation: ${error}`);
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

        {/* WebSocket Connection */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>
            WebSocket Connection
          </h4>
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
              marginBottom: "10px",
            }}
          >
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            Status: {isConnected ? "Connected" : "Disconnected"}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={connectWebSocket}
              disabled={isConnected}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                background: isConnected ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isConnected ? "not-allowed" : "pointer",
                fontSize: "12px",
              }}
            >
              <Wifi size={12} />
              Connect
            </button>
            <button
              onClick={disconnectWebSocket}
              disabled={!isConnected}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                background: !isConnected ? "#ccc" : "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: !isConnected ? "not-allowed" : "pointer",
                fontSize: "12px",
              }}
            >
              <WifiOff size={12} />
              Disconnect
            </button>
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
            <div>
              <h4 style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                {selectedNodeId ? `Messages for ${selectedNodeId}` : "Global Messages"}
              </h4>
              <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                {selectedNodeId
                  ? `Personal inbox (max ${MAX_MESSAGES_PER_NODE} messages)`
                  : "System messages and connection status"
                }
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {selectedNodeId && (
                <button
                  onClick={onBackToGlobal}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  <Home size={10} />
                  Global
                </button>
              )}
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
          </div>

          <div
            style={{
              height: "300px",
              overflowY: "auto",
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: "#fafafa",
              padding: "8px",
            }}
          >
            {getMessagesToDisplay().length === 0 ? (
              <div
                style={{ color: "#666", fontStyle: "italic", fontSize: "12px" }}
              >
                {selectedNodeId
                  ? `No messages in ${selectedNodeId}'s inbox yet. Start simulation to see node-specific messages.`
                  : "No global messages yet. Connect to WebSocket and start simulation to see system messages."
                }
              </div>
            ) : (
              getMessagesToDisplay().map((message) => (
                <div
                  key={message.id}
                  style={{
                    marginBottom: "6px",
                    padding: "6px",
                    background: "white",
                    borderRadius: "3px",
                    borderLeft: selectedNodeId ? "2px solid #2196f3" : "2px solid #007bff",
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
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationMonitor;
