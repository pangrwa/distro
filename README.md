
# Distro

### Prerequisites
#### Backend
- Java 17 or later
- Maven
- Docker

#### Frontend
- Node.js (v14 or higher)
- npm 


### Build the Project
#### Backend
```bash
chmod +x scripts/build.sh
./scripts/build.sh
```

#### Frontend
```bash
cd frontend/simulator-frontend
npm install
```

### Run the Simulation
#### Without frontend UI
```bash
chmod +x scripts/run-simulation.sh
./scripts/run-simulation.sh examples/topology.yml
```

**Alternative: Run with Docker Compose**:
```bash
docker-compose -f docker/docker-compose.yml up
```

**Command Line Interface**:
- Once the simulation is running, you can:
  - `pause <node-id>` - Pause a node
  - `resume <node-id>` - Resume a paused node
  - `stop <node-id>` - Stop a node
  - `exit` - Exit the simulator

Some useful docker comamnds
```bash
# View the network topology
docker network ls
docker network inspect simulator-network

# View the logs from the terminal
# I would recommend using this with tmux split screen
docker logs -f <container-name>
```

#### With the frontend

**Run the server**
```bash
# Ensure that your docker is running in your background before starting the server
mvn spring-boot:run
```

**Start the frontend**
```bash
cd frontend/simulator-frontend
npm start

```
The application will open at `http://localhost:3000`


### Note
- Remember to recompile your code using `mvn clean package` if you make any changes to your distributed algorithm
