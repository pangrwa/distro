package com.example.simulator;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import org.junit.Before;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.ConnectToNetworkCmd;
import com.github.dockerjava.api.command.CreateContainerCmd;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.CreateNetworkCmd;
import com.github.dockerjava.api.command.CreateNetworkResponse;
import com.github.dockerjava.api.command.ListNetworksCmd;
import com.github.dockerjava.api.command.PauseContainerCmd;
import com.github.dockerjava.api.command.StartContainerCmd;
import com.github.dockerjava.api.command.StopContainerCmd;
import com.github.dockerjava.api.command.UnpauseContainerCmd;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class DockerManagerTest {

  @Mock
  private DockerClient dockerClient;

  @Mock
  private CreateNetworkCmd createNetworkCmd;

  @Mock
  private ConnectToNetworkCmd connectToNetworkCmd;

  @Mock
  private CreateNetworkResponse createNetworkResponse;

  @Mock
  private ListNetworksCmd listNetworksCmd;

  @Mock
  private CreateContainerCmd createContainerCmd;

  @Mock
  private CreateContainerResponse createContainerResponse;

  @Mock
  private StartContainerCmd startContainerCmd;

  @Mock
  private PauseContainerCmd pauseContainerCmd;

  @Mock
  private UnpauseContainerCmd unpauseContainerCmd;

  @Mock
  private StopContainerCmd stopContainerCmd;

  private DockerManager dockerManager;

  @Before
  public void setup() {
    MockitoAnnotations.openMocks(this);

    // Mock network creation
    when(dockerClient.createNetworkCmd()).thenReturn(createNetworkCmd);
    when(createNetworkCmd.withName(anyString())).thenReturn(createNetworkCmd);
    when(createNetworkCmd.withDriver(anyString())).thenReturn(createNetworkCmd);
    when(createNetworkCmd.exec()).thenReturn(createNetworkResponse);
    when(createNetworkResponse.getId()).thenReturn("network-123");

    // mock connecting to the isolated network system
    when(dockerClient.connectToNetworkCmd()).thenReturn(connectToNetworkCmd);
    when(connectToNetworkCmd.withNetworkId(anyString())).thenReturn(connectToNetworkCmd);
    when(connectToNetworkCmd.withContainerId(anyString())).thenReturn(connectToNetworkCmd);

    // Mock network listing
    when(dockerClient.listNetworksCmd()).thenReturn(listNetworksCmd);
    when(listNetworksCmd.withNameFilter(anyString())).thenReturn(listNetworksCmd);
    when(listNetworksCmd.exec()).thenReturn(new ArrayList<>()); // Initially no networks

    // Mock container creation
    when(dockerClient.createContainerCmd(anyString())).thenReturn(createContainerCmd);
    when(createContainerCmd.withName(anyString())).thenReturn(createContainerCmd);
    when(createContainerCmd.withEnv(anyList())).thenReturn(createContainerCmd);
    when(createContainerCmd.withHostName(anyString())).thenReturn(createContainerCmd);
    when(createContainerCmd.exec()).thenReturn(createContainerResponse);
    when(createContainerResponse.getId()).thenReturn("container-123");

    // Mock container start
    when(dockerClient.startContainerCmd(anyString())).thenReturn(startContainerCmd);

    // Mock container pause/unpause
    when(dockerClient.pauseContainerCmd(anyString())).thenReturn(pauseContainerCmd);
    when(dockerClient.unpauseContainerCmd(anyString())).thenReturn(unpauseContainerCmd);

    // Mock container stop
    when(dockerClient.stopContainerCmd(anyString())).thenReturn(stopContainerCmd);

    // Create DockerManager with mocked client
    dockerManager = new DockerManager(dockerClient);
  }

  @Test
  public void testCreateNetwork() {
    // Verify network creation
    verify(createNetworkCmd).withName("simulator-network");
    verify(createNetworkCmd).withDriver("bridge");
    verify(createNetworkCmd).exec();
  }

  @Test
  public void testCreateNodeContainer() {
    // Prepare test data
    String nodeId = "test-node";
    String programName = "test-program";
    List<String> peerNodeIds = Arrays.asList("peer1", "peer2");

    // Create container
    String containerId = dockerManager.createNodeContainer(nodeId, programName, peerNodeIds);

    // Verify container creation
    assertEquals("container-123", containerId);
    verify(createContainerCmd).withName("test-node");
    verify(createContainerCmd).withHostName("test-node");
    verify(startContainerCmd).exec();
  }

  @Test
  public void testPauseAndResumeNode() {
    // First create a node
    dockerManager.createNodeContainer("test-node", "test-program", new ArrayList<>());

    // Pause the node
    dockerManager.pauseNode("test-node");
    verify(pauseContainerCmd).exec();

    // Resume the node
    dockerManager.resumeNode("test-node");
    verify(unpauseContainerCmd).exec();
  }

  @Test
  public void testStopNode() {
    // First create a node
    dockerManager.createNodeContainer("test-node", "test-program", new ArrayList<>());

    // Stop the node
    dockerManager.stopNode("test-node");
    verify(stopContainerCmd).exec();
  }
}
