package com.example.simulator;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.InspectContainerResponse;
import com.github.dockerjava.api.model.Network;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;

public class DockerManager {
  private DockerClient dockerClient;
  private String networkId;
  private Map<String, String> nodeContainerIds = new HashMap<>();
  private final String networkName = "simulator-network";

  /**
   * Constructor with dependency injection for testing.
   * 
   * @param dockerClient The Docker client to use
   */
  public DockerManager(DockerClient dockerClient) {
    this.dockerClient = dockerClient;
    initializeNetwork();
  }

  public DockerManager() {
    DockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();

    DockerHttpClient httpClient = new ApacheDockerHttpClient.Builder()
        .dockerHost(config.getDockerHost())
        .sslConfig(config.getSSLConfig())
        .maxConnections(100)
        .connectionTimeout(Duration.ofSeconds(30))
        .responseTimeout(Duration.ofSeconds(45))
        .build();

    // Initialise a docker client here
    dockerClient = DockerClientImpl.getInstance(config, httpClient);
    initializeNetwork();
  }

  private void initializeNetwork() {
    // Create a Docker network for the simulation
    try {
      // Try to find existing network
      List<Network> networks = dockerClient.listNetworksCmd()
          .withNameFilter(networkName)
          .exec();

      if (networks.isEmpty()) {
        // Create network if it doesn't exist
        this.networkId = dockerClient.createNetworkCmd()
            .withName(networkName)
            .withDriver("bridge") // isolate from the rest of my system
            .exec()
            .getId();
        System.out.println("Created new Docker network: " + networkName);
      } else {
        this.networkId = networks.get(0).getId();
        System.out.println("Using existing Docker network: " + networkName);
      }
    } catch (Exception e) {
      throw new RuntimeException("Failed to create/find network: " + e.getMessage(), e);
    }
  }

  public String createNodeContainer(String nodeId, String programName, List<String> peerNodeIds) {
    try {
      // Create environment variables for the container
      List<String> env = new ArrayList<>();
      env.add("NODE_ID=" + nodeId);
      env.add("PROGRAM_NAME=" + programName);
      env.add("PEER_NODES=" + String.join(",", peerNodeIds));

      // Create container
      CreateContainerResponse container = dockerClient.createContainerCmd("distro/node:latest")
          .withName(nodeId)
          .withEnv(env)
          .withHostName(nodeId) // Important: hostname = nodeId for DNS resolution
          .exec();

      String containerId = container.getId();
      nodeContainerIds.put(nodeId, containerId);

      // brings this container into the isolated network system
      dockerClient.connectToNetworkCmd()
          .withNetworkId(networkId)
          .withContainerId(containerId)
          .exec();

      // Start container
      dockerClient.startContainerCmd(containerId).exec();
      System.out.println("Created and started container for node " + nodeId + " (ID: " + containerId + ")");

      return containerId;
    } catch (Exception e) {
      throw new RuntimeException("Failed to create node container: " + e.getMessage(), e);
    }
  }

  public void pauseNode(String nodeId) {
    String containerId = nodeContainerIds.get(nodeId);
    if (containerId != null) {
      dockerClient.pauseContainerCmd(containerId).exec();
      System.out.println("Paused node: " + nodeId);
    }
  }

  public void resumeNode(String nodeId) {
    String containerId = nodeContainerIds.get(nodeId);
    if (containerId != null) {
      dockerClient.unpauseContainerCmd(containerId).exec();
      System.out.println("Resumed node: " + nodeId);
    }
  }

  public void stopNode(String nodeId) {
    String containerId = nodeContainerIds.get(nodeId);
    if (containerId != null) {
      dockerClient.stopContainerCmd(containerId).exec();
      System.out.println("Stopped node: " + nodeId);
    }
  }

  public void cleanupContainers() {
    // Stop and remove all containers
    for (Map.Entry<String, String> entry : nodeContainerIds.entrySet()) {
      String nodeId = entry.getKey();
      String containerId = entry.getValue();

      try {
        dockerClient.stopContainerCmd(containerId).exec();
        System.out.println("Stopped container for node " + nodeId);

        dockerClient.removeContainerCmd(containerId).exec();
        System.out.println("Removed container for node " + nodeId);
      } catch (Exception e) {
        // Container might already be stopped/removed
        System.out.println("Error cleaning up container for node " + nodeId + ": " + e.getMessage());
      }
    }
  }

  /*
   * Take note I think there's a flaw in how the Docker Java Library consumes the
   * response message from the dameon before it actully closes the connection
   * But the docker command will still get executed correctly and the image will
   * get removed
   */
  public void cleanupImages() {
    // remove all the images that was created
    try {
      dockerClient.removeImageCmd("distro/node:latest")
          .withForce(true)
          .exec();
      System.out.println("Removed node image");

      dockerClient.removeImageCmd("distro/controller:latest")
          .withForce(true)
          .exec();
      System.out.println("Removed controller image");
    } catch (Exception e) {
      System.out.println("Error removing images: " + e.getMessage());
    }
  }

  public String getNodeIpAddress(String nodeId) {
    String containerId = nodeContainerIds.get(nodeId);
    if (containerId != null) {
      InspectContainerResponse inspectResponse = dockerClient.inspectContainerCmd(containerId).exec();
      return inspectResponse.getNetworkSettings().getNetworks().get(networkName).getIpAddress();
    }
    return null;
  }
}
