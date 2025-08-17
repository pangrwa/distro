package com.example.simulator;

import java.nio.charset.StandardCharsets;
import java.io.*;
import java.net.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import com.example.util.AnsiColor;
import com.example.api.NodeProgram;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class JitterTcpChannel {
  private static final int TCP_PORT = 8888;
  private static final Logger logger = LoggerFactory.getLogger(JitterTcpChannel.class);

  private final String nodeId;
  private final double dropRate;
  private final long delayMs;
  private final ServerSocket serverSocket;
  private final Map<String, Socket> connections = new ConcurrentHashMap<>();
  private final NodeProgram nodeProgram;
  private volatile boolean isRunning = true;

  public JitterTcpChannel(String nodeId, double dropRate, long delayMs, NodeProgram nodeProgram)
      throws IOException {
    this.nodeId = nodeId;
    this.dropRate = dropRate; // 0.0 to 1.0 (0% to 100% drop rate)
    this.delayMs = delayMs; // artificial delay in milliseconds
    this.serverSocket = new ServerSocket(TCP_PORT);
    this.nodeProgram = nodeProgram;

    // Start accepting connections in background
    Thread acceptorThread = new Thread(this::acceptConnections);
    acceptorThread.setDaemon(true);
    acceptorThread.start();
  }

  public void sendMessage(byte[] message, String recipientNodeId) {
    try {
      // Simulate message dropping
      if (shouldDropMessage()) {
        logger.info(nodeId + ": [JITTER] Dropping message to " + recipientNodeId);
        return;
      }

      // Simulate network delay
      if (delayMs > 0) {
        Thread.sleep(delayMs);
      }

      Socket socket = getOrCreateConnection(recipientNodeId);
      if (socket != null && !socket.isClosed()) {
        DataOutputStream out = new DataOutputStream(socket.getOutputStream());

        // Send message length first, then message content
        out.writeInt(message.length);
        out.write(message);
        out.flush();

        String formattedMessage = nodeProgram.decodeMessage(message);
        logger.info(nodeId + ": [TCP] " + AnsiColor.colorize("SENT", AnsiColor.YELLOW) + " to " + recipientNodeId + ": "
            + formattedMessage);
      }
    } catch (Exception e) {
      logger.error(nodeId + ": Error sending message to " + recipientNodeId + ": " + e.getMessage());
      // Remove failed connection
      connections.remove(recipientNodeId);
    }
  }

  public MessageData receiveMessage() throws InterruptedException {
    // This will be called by MessageReceiver implementation
    // For now, return null as we handle incoming connections via acceptConnections
    return null;
  }

  private Socket getOrCreateConnection(String recipientNodeId) {
    return connections.get(recipientNodeId);
  }

  private void acceptConnections() {
    while (isRunning) {
      try {
        Socket clientSocket = serverSocket.accept();
        String rawHost = clientSocket.getInetAddress().getHostName();
        int dotIndex = rawHost.indexOf('.');
        if (dotIndex != -1) {
          rawHost = rawHost.substring(0, dotIndex);
        }

        final String clientHost = rawHost;

        // Handle each client connection in a separate thread - Async would be better
        Thread clientHandler = new Thread(() -> handleClient(clientSocket, clientHost));
        clientHandler.setDaemon(true);
        clientHandler.start();

      } catch (IOException e) {
        if (isRunning) {
          logger.error(nodeId + ": Error accepting connection: " + e.getMessage());
        }
      }
    }
  }

  private void handleClient(Socket clientSocket, String clientHost) {
    try (DataInputStream in = new DataInputStream(clientSocket.getInputStream())) {
      while (!clientSocket.isClosed() && isRunning) {
        // Read message length first
        int messageLength = in.readInt();

        // Read the actual message
        byte[] buffer = new byte[messageLength];
        in.readFully(buffer);

        // Simulate message dropping on receive
        if (shouldDropMessage()) {
          logger.info(nodeId + ": [JITTER] Dropping received message from " + clientHost);
          continue;
        }

        // Queue the message for the receiver (implement a message queue)
        queueIncomingMessage(new MessageData(buffer, clientHost));
      }
    } catch (Exception e) {
      logger.error(nodeId + ": Error handling client " + clientHost + ": " + e.getMessage());
    }
  }

  private boolean shouldDropMessage() {
    return ThreadLocalRandom.current().nextDouble() < dropRate;
  }

  private final java.util.concurrent.BlockingQueue<MessageData> incomingMessages = new java.util.concurrent.LinkedBlockingQueue<>();

  private void queueIncomingMessage(MessageData messageData) {
    incomingMessages.offer(messageData);
  }

  public MessageData getNextMessage() throws InterruptedException {

    // Simulate network delay
    if (delayMs > 0) {
      Thread.sleep(delayMs);
    }

    MessageData top = incomingMessages.peek();
    String clientHost = top.getSenderHostname();
    byte[] buffer = top.getData();

    String formattedMessage = nodeProgram.decodeMessage(buffer);
    logger.info(nodeId + ": [TCP] " + AnsiColor.colorize("RECIEVED", AnsiColor.GREEN) + " from " + clientHost + ": "
        + formattedMessage);
    return incomingMessages.take(); // Blocks until a message is available
  }

  public void establishConnections(java.util.List<String> peerNodeIds) throws IOException {
    logger.info(nodeId + ": [TCP] Establishing connections to peers...");

    for (String peerNodeId : peerNodeIds) {
      if (peerNodeId.equals(nodeId)) {
        continue; // Skip self
      }

      int maxRetries = 10;
      int retryDelayMs = 500;

      for (int attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          InetAddress address = InetAddress.getByName(peerNodeId);
          Socket socket = new Socket(address, TCP_PORT);
          connections.put(peerNodeId, socket);
          logger.info(nodeId + ": [TCP] Connected to " + peerNodeId + " (attempt " + attempt + ")");
          break;
        } catch (Exception e) {
          logger.error(
              nodeId + ": Failed to connect to " + peerNodeId + " (attempt " + attempt + "): " + e.getMessage());

          if (attempt == maxRetries) {
            throw new IOException("Failed to connect to " + peerNodeId + " after " + maxRetries + " attempts", e);
          }

          try {
            Thread.sleep(retryDelayMs);
            if (retryDelayMs < 4000) {
              retryDelayMs *= 2;
            }
          } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new IOException("Connection establishment interrupted", ie);
          }
        }
      }
    }

    logger.info(nodeId + ": [TCP] All connections established successfully");
  }

  public void close() {
    isRunning = false;
    try {
      serverSocket.close();
      for (Socket socket : connections.values()) {
        socket.close();
      }
    } catch (IOException e) {
      logger.error("Error closing JitterTcpChannel: " + e.getMessage());
    }
  }

  public static class MessageData {
    private final byte[] data;
    private final String senderHostname;

    public MessageData(byte[] data, String senderHostname) {
      this.data = data;
      this.senderHostname = senderHostname;
    }

    public byte[] getData() {
      return data;
    }

    public String getSenderHostname() {
      return senderHostname;
    }
  }
}
