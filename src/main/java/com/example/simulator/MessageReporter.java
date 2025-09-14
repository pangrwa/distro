
package com.example.simulator;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * NodeRunner would call this abstraction to forward messages to the MessageMonitor service which would forward the messages to frontend
 */
public class MessageReporter {
  private final ExecutorService executor = Executors.newSingleThreadExecutor();
  private final String nodeId;
  private final String monitorEndpoint;
  private final String monitorPort;

  private static final ObjectMapper objectMapper = new ObjectMapper();
  private static final Logger logger = LoggerFactory.getLogger(MessageReporter.class);

  public MessageReporter(String nodeId, String monitorEndpoint, String monitorPort) {
    this.nodeId = nodeId;
    this.monitorEndpoint = monitorEndpoint;
    this.monitorPort = monitorPort;
  }

  public void reportMessageSent(String toNode, byte[] message, long timestamp) {
    executor.submit(() -> {

      try {
        MessageEvent event = new MessageEvent("SENT", nodeId, toNode,
            new String(message, StandardCharsets.UTF_8), timestamp);
        sendToMonitor(event);
      } catch (Exception e) {
        logger.error("Node: {} failed to report message sent: {}", nodeId, e.getMessage());
      }
    });
  }

  public void reportMessageReceived(String fromNode, byte[] message, long timestamp) {
    executor.submit(() -> {

      try {
        MessageEvent event = new MessageEvent("RECEIVED", fromNode, nodeId,
            new String(message, StandardCharsets.UTF_8), timestamp);
        sendToMonitor(event);
      } catch (Exception e) {
        logger.error("Node: {} failed to report message received: {}", nodeId, e.getMessage());
      }
    });
  }

  public void shutdown() {
    executor.shutdown();
  }

  private void sendToMonitor(MessageEvent event) throws Exception {
    HttpClient client = HttpClient.newHttpClient();
    byte[] json = objectMapper.writeValueAsBytes(event);

    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("http://" + monitorEndpoint + ":" + monitorPort + "/message"))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofByteArray(json))
        .build();

    // Send request and get response
    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
  }

  public static class MessageEvent {
    public String type;
    public String fromNode;
    public String toNode;
    public String message;
    public long timestamp;

    public MessageEvent() {
    }

    public MessageEvent(String type, String fromNode, String toNode, String message, long timestamp) {
      this.type = type;
      this.fromNode = fromNode;
      this.toNode = toNode;
      this.message = message;
      this.timestamp = timestamp;
    }
  }
}
