import React, { useState } from 'react';
import { Play, Square, FileText } from 'lucide-react';
import { NodeData, JitterConfig } from '../types/topology';
import { generateYamlFromNodes, downloadYaml, generateJitterEnvVars } from '../utils/yamlGenerator';

interface SimulationRunnerProps {
  nodes: NodeData[];
  jitterConfig: JitterConfig;
}

const SimulationRunner: React.FC<SimulationRunnerProps> = ({ nodes, jitterConfig }) => {
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationOutput, setSimulationOutput] = useState<string>('');

  const generateRunInstructions = () => {
    const yamlContent = generateYamlFromNodes(nodes);
    
    return `# Steps to run the simulation:

## 1. Save the YAML configuration
Create a file called 'topology.yml' with the following content:

${yamlContent}

## 2. Set environment variables for jitter configuration
export DROP_RATE=${jitterConfig.dropRate}
export DELAY_MS=${jitterConfig.delayMs}

## 3. Build and run the Java simulator
# From the root directory of your project:
mvn clean compile
mvn exec:java -Dexec.mainClass="com.example.simulator.DockerSimulator" -Dexec.args="topology.yml"

## 4. Alternative: Run with Maven directly
mvn clean package
java -jar target/simulator-1.0-SNAPSHOT.jar topology.yml

## 5. Using Docker (if you have docker-compose setup)
# Make sure your docker-compose.yml uses the generated topology
docker-compose up --build
`;
  };

  const handleDownloadInstructions = () => {
    const instructions = generateRunInstructions();
    const blob = new Blob([instructions], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simulation-instructions.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleStartSimulation = () => {
    // This would integrate with your Java backend
    // For now, just show the configuration
    const yamlContent = generateYamlFromNodes(nodes);
    downloadYaml(yamlContent, 'topology.yml');
    
    setSimulationOutput(`Simulation configuration generated!
    
YAML Configuration:
${yamlContent}

Environment Variables:
${generateJitterEnvVars(jitterConfig)}

To run the simulation, execute the Java DockerSimulator with the generated topology.yml file.`);
    
    setIsSimulationRunning(true);
    
    // Simulate stopping after some time (in real implementation, this would be controlled by the Java process)
    setTimeout(() => {
      setIsSimulationRunning(false);
      setSimulationOutput(prev => prev + '\n\nSimulation completed.');
    }, 5000);
  };

  const handleStopSimulation = () => {
    setIsSimulationRunning(false);
    setSimulationOutput(prev => prev + '\n\nSimulation stopped by user.');
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#f9f9f9', 
      borderRadius: '8px',
      marginTop: '20px'
    }}>
      <h4>Simulation Control</h4>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={handleStartSimulation}
          disabled={isSimulationRunning || nodes.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 15px',
            background: isSimulationRunning ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSimulationRunning || nodes.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          <Play size={16} />
          Start Simulation
        </button>
        
        <button
          onClick={handleStopSimulation}
          disabled={!isSimulationRunning}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 15px',
            background: !isSimulationRunning ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isSimulationRunning ? 'not-allowed' : 'pointer'
          }}
        >
          <Square size={16} />
          Stop Simulation
        </button>
        
        <button
          onClick={handleDownloadInstructions}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 15px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          <FileText size={16} />
          Download Instructions
        </button>
      </div>

      {isSimulationRunning && (
        <div style={{ 
          padding: '10px', 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <strong>Simulation Status:</strong> Running...
        </div>
      )}

      {nodes.length === 0 && (
        <div style={{ 
          padding: '10px', 
          background: '#f8d7da', 
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <strong>Warning:</strong> No nodes configured. Please add nodes to the topology before starting simulation.
        </div>
      )}

      {simulationOutput && (
        <div style={{ marginTop: '10px' }}>
          <h5>Simulation Output:</h5>
          <pre style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '300px',
            border: '1px solid #dee2e6'
          }}>
            {simulationOutput}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
        <h5>Next Steps:</h5>
        <ol>
          <li>Configure your network topology using the visual editor</li>
          <li>Set jitter parameters (drop rate and delay)</li>
          <li>Click "Start Simulation" to generate YAML configuration</li>
          <li>Use the generated files with your Java DockerSimulator</li>
        </ol>
      </div>
    </div>
  );
};

export default SimulationRunner;