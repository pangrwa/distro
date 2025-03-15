#!/bin/bash
# scripts/run-simulation.sh

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <topology-file>"
    exit 1
fi

TOPOLOGY_FILE=$1

# Check if file exists
if [ ! -f "$TOPOLOGY_FILE" ]; then
    echo "Error: Topology file '$TOPOLOGY_FILE' not found."
    exit 1
fi

echo "Starting simulation with topology: $TOPOLOGY_FILE"
java -jar target/simulator.jar "$TOPOLOGY_FILE"
