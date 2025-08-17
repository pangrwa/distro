package com.example.programs;

import java.nio.charset.StandardCharsets;
import java.util.List;

import com.example.api.MessageReceiver;
import com.example.api.MessageSender;
import com.example.api.NodeProgram;
import com.example.api.Storage;
import com.example.util.Pair;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * A very basic algorithm that simply echoes back any message received
 * and periodically sends a heartbeat to its neighbors.
 */
public class EchoAlgorithm implements NodeProgram {
  private static final ObjectMapper objectMapper = new ObjectMapper();

  @Override
  public void execute(List<String> peerNids, String myNid,
      MessageSender sender, MessageReceiver receiver,
      Storage storage) {
    try {
      System.out.println(myNid + ": Starting Echo Algorithm - basic communication mode");

      // Counter for heartbeat messages
      int heartbeatCount = 0;

      // Start time for sending heartbeats
      long lastHeartbeatTime = System.currentTimeMillis();

      sendHeartbeat(myNid, sender, peerNids, heartbeatCount++);

      while (true) {
        // Check if it's time to send a heartbeat (every 5 seconds)
        // long currentTime = System.currentTimeMillis();
        // if (currentTime - lastHeartbeatTime > 5000) {
        // // Send a heartbeat to all peers
        // sendHeartbeat(myNid, sender, peerNids, heartbeatCount++);
        //
        // lastHeartbeatTime = currentTime;
        // }

        // Try to receive a message with a short timeout
        try {
          // Try to receive with a 1-second timeout
          Pair<byte[], String> received = receiver.receive();
          String senderNid = received.getRight();
          byte[] messageBytes = received.getLeft();

          // Parse the received JSON message
          ObjectNode receivedJson = (ObjectNode) objectMapper.readTree(messageBytes);
          String messageContent = receivedJson.get("content").asText();
          // String messageType = receivedJson.has("type") ?
          // receivedJson.get("type").asText() : "unknown";

          // Create JSON echo response
          ObjectNode echoJson = objectMapper.createObjectNode();
          // echoJson.put("type", "echo");
          echoJson.put("content", messageContent);
          echoJson.put("sequence", receivedJson.get("sequence").asLong() + 1);
          echoJson.put("timestamp", System.currentTimeMillis());

          String echoJsonString = objectMapper.writeValueAsString(echoJson);
          sender.send(echoJsonString.getBytes(StandardCharsets.UTF_8), senderNid);

          // Also store last message from each sender
          storage.put("last_from_" + senderNid, messageContent);

        } catch (InterruptedException e) {
          // This is fine - just continue the loop
          Thread.sleep(100);
        }
      }
    } catch (Exception e) {
      System.err.println("[FAILURE] " + myNid + ": Error in Echo Algorithm: " + e.getMessage());
      e.printStackTrace();
    }
  }

  // Helper method to send heartbeats
  private void sendHeartbeat(String myNid, MessageSender sender, List<String> peerNids, int count) {
    try {
      ObjectNode heartbeatJson = objectMapper.createObjectNode();
      // heartbeatJson.put("type", "heartbeat");
      heartbeatJson.put("content", "HEARTBEAT");
      heartbeatJson.put("sequence", count);
      heartbeatJson.put("timestamp", System.currentTimeMillis());

      for (String peer : peerNids) {
        heartbeatJson.put("sender", myNid);
        String heartbeatJsonString = objectMapper.writeValueAsString(heartbeatJson);
        byte[] heartbeatBytes = heartbeatJsonString.getBytes(StandardCharsets.UTF_8);
        sender.send(heartbeatBytes, peer);
      }
    } catch (Exception e) {
      System.err.println("Error creating heartbeat JSON: " + e.getMessage());
    }
  }

  @Override
  public String decodeMessage(byte[] raw_data) {
    ObjectMapper mapper = new ObjectMapper();

    // Example: raw_data is a UTF-8 JSON string representing a Map
    try {
      Object obj = mapper.readValue(raw_data, Object.class); // Parse JSON
      String jsonStr = mapper.writeValueAsString(obj);
      String prettyJson = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(obj);
      return jsonStr;
    } catch (Exception e) {
      e.printStackTrace();
      return null;
    }

  }
}
