#!/bin/bash
# scripts/build.sh

set -e

echo "Building the project..."
mvn clean package

echo "Building Docker images..."
docker build -t distro/node -f docker/Dockerfile.node .
docker build -t distro/message-monitor -f docker/Dockerfile.message-monitor .
docker build -t distro/controller -f docker/Dockerfile.controller .

echo "Build complete. Run the simulation with: ./scripts/run-simulation.sh <topology-file>"

