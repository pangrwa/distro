# Distributed Algorithm Simulator Frontend

A React TypeScript frontend for visualizing and configuring network topologies for the distributed algorithm simulator.

## Features

1. **Visual Network Topology Editor**
   - Drag and drop node creation
   - Visual connection management
   - Support for different node programs (echo_algorithm, broadcast_algorithm, etc.)

2. **Topology Generation**
   - Pre-built topology patterns (ring, line, fully connected)
   - Configurable node count and naming
   - Custom individual node placement

3. **JitterTcpChannel Configuration**
   - Network drop rate configuration (0-100%)
   - Network delay configuration (0-10000ms)
   - Real-time parameter updates

4. **YAML Export/Import**
   - Generate YAML files compatible with your Java simulator
   - Load existing YAML configurations
   - Download ready-to-use configuration files

5. **Simulation Integration**
   - Generate run instructions for Java simulator
   - Environment variable generation for jitter configuration
   - Step-by-step setup guide

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
cd frontend/simulator-frontend
npm install
```

### Running the Application

```bash
npm start
```

The application will open at `http://localhost:3000`.

## Usage

### Creating a Network Topology

1. **Quick Topology Generation:**
   - Select topology type (ring, line, fully connected)
   - Set number of nodes
   - Choose program type
   - Set node ID prefix
   - Click "Generate Topology"

2. **Manual Node Creation:**
   - Enter node ID in the text field
   - Click "Add Node"
   - Drag nodes in the visualization area
   - Click and drag between nodes to create connections

3. **Node Configuration:**
   - Click on any node to change its program
   - Use the trash icon to delete nodes
   - Connections are automatically bidirectional

### Configuring Network Jitter

- **Drop Rate:** Set packet drop percentage (0-100%)
- **Delay:** Set network delay in milliseconds (0-10000ms)

### Generating Configuration Files

1. Click "Generate YAML" to create and download the topology file
2. Click "Download Instructions" to get step-by-step run instructions
3. Use the "Start Simulation" button to generate all necessary files

### Integration with Java Simulator

The generated YAML file can be used directly with your Java `DockerSimulator`:

```bash
# Using the generated topology.yml
java -jar target/simulator.jar topology.yml
```

Environment variables for jitter configuration:
```bash
export DROP_RATE=0.1
export DELAY_MS=5000
```

## File Structure

```
src/
├── components/
│   ├── NetworkVisualization.tsx  # Main visualization component
│   ├── TopologyPanel.tsx         # Configuration panel
│   ├── CustomNode.tsx            # Node component for ReactFlow
│   └── SimulationRunner.tsx      # Simulation control interface
├── types/
│   └── topology.ts               # TypeScript type definitions
├── utils/
│   └── yamlGenerator.ts          # YAML generation utilities
└── App.tsx                       # Main application component
```

## Dependencies

- **ReactFlow**: For network visualization and node editing
- **js-yaml**: For YAML parsing and generation
- **lucide-react**: For icons
- **TypeScript**: For type safety

## YAML Format Compatibility

The frontend generates YAML files compatible with your existing `TopologyManager.java`:

```yaml
individual_nodes:
  - nid: "node-0"
    program: "echo_algorithm"
    connections:
      - "node-1"
  - nid: "node-1"
    program: "echo_algorithm"
    connections:
      - "node-0"
      - "node-2"
```

## Next Steps

1. **Backend Integration**: Add REST API endpoints to start/stop simulations directly from the frontend
2. **Real-time Monitoring**: Display live simulation output and node status
3. **Message Visualization**: Show message passing between nodes in real-time
4. **Advanced Topologies**: Support for more complex network patterns
5. **Simulation History**: Save and load previous simulation configurations