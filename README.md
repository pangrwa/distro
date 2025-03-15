
1. **Prerequisites**:
   - Java 11 or later
   - Maven
   - Docker

2. **Build the Project**:
   ```bash
   chmod +x scripts/build.sh
   ./scripts/build.sh
   ```

3. **Run the Simulation**:
   ```bash
   chmod +x scripts/run-simulation.sh
   ./scripts/run-simulation.sh examples/topology.yml
   ```

4. **Alternative: Run with Docker Compose**:
   ```bash
   docker-compose -f docker/docker-compose.yml up
   ```

5. **Command Line Interface**:
   - Once the simulation is running, you can:
     - `pause <node-id>` - Pause a node
     - `resume <node-id>` - Resume a paused node
     - `stop <node-id>` - Stop a node
     - `exit` - Exit the simulator
