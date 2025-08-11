package com.example.simulator;

import java.util.Arrays;
import java.util.List;

import java.nio.charset.StandardCharsets;

import com.example.api.MessageReceiver;
import com.example.api.MessageSender;
import com.example.api.NodeProgram;
import com.example.api.Storage;
import com.example.programs.EchoAlgorithm;
import com.example.util.InMemoryStorage;
import com.example.util.Pair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class NodeRunner {
  private static final double DEFAULT_DROP_RATE = 0; // 10% message drop rate
  private static final long DEFAULT_DELAY_MS = 5000; // 50ms network delay
  private static String nodeId;

  private static final Logger logger = LoggerFactory.getLogger(NodeRunner.class);

  public static void main(String[] args) throws Exception {
    // Get configuration from environment variables, these would have been set from
    // the docker containers
    nodeId = System.getenv("NODE_ID");
    String programName = System.getenv("PROGRAM_NAME");
    String peerNodesStr = System.getenv("PEER_NODES");

    List<String> peerNodeIds = Arrays.asList(peerNodesStr.split(","));

    logger.info("Starting node " + nodeId + " with program " + programName);
    logger.info("Peer nodes: " + peerNodesStr);

    // Get jitter configuration from environment variables
    double dropRate = parseDoubleFromEnv("DROP_RATE", DEFAULT_DROP_RATE);
    long delayMs = parseLongFromEnv("DELAY_MS", DEFAULT_DELAY_MS);

    logger.info("Network simulation - Drop rate: " + (dropRate * 100) + "%, Delay: " + delayMs + "ms");

    NodeProgram program = loadProgram(programName);

    Storage storage = new InMemoryStorage();

    // Create TCP channel with jitter simulation
    JitterTcpChannel tcpChannel = new JitterTcpChannel(nodeId, dropRate, delayMs, program);
    MessageSender sender = createMessageSender(tcpChannel);
    MessageReceiver receiver = createMessageReceiver(tcpChannel);

    // Establish all "transmitting" connections before starting the algorithm
    tcpChannel.establishConnections(peerNodeIds);

    program.execute(peerNodeIds, nodeId, sender, receiver, storage);

  }

  private static NodeProgram loadProgram(String programName) {
    // maybe we could use reflection
    switch (programName) {
      case "echo_algorithm":
        return new EchoAlgorithm();
      default:
        return new EchoAlgorithm();
    }
  }

  private static MessageSender createMessageSender(JitterTcpChannel tcpChannel) {
    return (message, recipientNid) -> {
      tcpChannel.sendMessage(message, recipientNid);
    };
  }

  private static MessageReceiver createMessageReceiver(JitterTcpChannel tcpChannel) {
    return () -> {
      try {
        JitterTcpChannel.MessageData messageData = tcpChannel.getNextMessage();
        return new Pair<byte[], String>(messageData.getData(), messageData.getSenderHostname());
      } catch (Exception e) {
        logger.error("Error receiving message: " + e.getMessage());
        throw new InterruptedException("TCP receive interrupted");
      }
    };
  }

  private static double parseDoubleFromEnv(String envVar, double defaultValue) {
    String value = System.getenv(envVar);
    if (value != null) {
      try {
        return Double.parseDouble(value);
      } catch (NumberFormatException e) {
        logger.error("Invalid " + envVar + " value: " + value + ", using default: " + defaultValue);
      }
    }
    return defaultValue;
  }

  private static long parseLongFromEnv(String envVar, long defaultValue) {
    String value = System.getenv(envVar);
    if (value != null) {
      try {
        return Long.parseLong(value);
      } catch (NumberFormatException e) {
        logger.error("Invalid " + envVar + " value: " + value + ", using default: " + defaultValue);
      }
    }
    return defaultValue;
  }
}
