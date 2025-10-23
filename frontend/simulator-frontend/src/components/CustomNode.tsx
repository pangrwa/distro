import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Trash2 } from "lucide-react";

interface CustomNodeData {
  label: string;
  program: string;
  onProgramChange: (nodeId: string, program: string) => void;
  onDelete: (nodeId: string) => void;
}

const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ data, id }) => {
  return (
    <div
      style={{
        background: "#fff",
        border: "2px solid #333",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
        {data.label}
      </div>

      <div
        style={{
          padding: "4px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        {data.program}
      </div>

      <button
        onClick={() => data.onDelete(id)}
        style={{
          position: "absolute",
          top: "-8px",
          right: "-8px",
          background: "#ff4444",
          border: "none",
          borderRadius: "50%",
          width: "20px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "white",
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

export default CustomNode;
