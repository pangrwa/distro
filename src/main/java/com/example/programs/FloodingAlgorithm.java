package com.example.programs;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.example.api.MessageReceiver;
import com.example.api.MessageSender;
import com.example.api.NodeProgram;
import com.example.api.Storage;
import com.example.util.Pair;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * A flooding broadcast algorithm that propagates the first received message
 * to all neighbors. Subsequent messages are ignored to prevent infinite loops.
 */
public class FloodingAlgorithm implements NodeProgram {
  private static final ObjectMapper objectMapper = new ObjectMapper();

  @Override
  public void execute(List<String> peerNids, String myNid,
      MessageSender sender, MessageReceiver receiver,
      Storage storage) {
    try {
      System.out.println(myNid + ": Starting Flooding Algorithm");

      boolean hasReceived = false;
      // Send initial message to all peers
      // we self declare a central coordinator
      if (myNid.equals("central")) {
        hasReceived = true;
        sendInitialMessage(myNid, sender, peerNids);
      }

      while (true) {
        try {
          // Try to receive a message
          Pair<byte[], String> received = receiver.receive();
          String senderNid = received.getRight();
          byte[] messageBytes = received.getLeft();

          if (hasReceived) {
            continue;
          }

          hasReceived = true;

          // Parse the received JSON message
          ObjectNode receivedJson = (ObjectNode) objectMapper.readTree(messageBytes);
          String messageContent = receivedJson.get("content").asText();
          long messageSequence = receivedJson.get("sequence").asLong();

          System.out.println(myNid + ": Received new message from " + senderNid
              + ", flooding to all neighbors except sender");

          // Create a flood JSON response with updated sequence
          ObjectNode floodJson = objectMapper.createObjectNode();
          floodJson.put("content", messageContent);
          floodJson.put("sequence", messageSequence);
          floodJson.put("timestamp", System.currentTimeMillis());
          floodJson.put("originalSender", receivedJson.has("originalSender")
              ? receivedJson.get("originalSender").asText()
              : senderNid);

          String floodJsonString = objectMapper.writeValueAsString(floodJson);
          byte[] floodBytes = floodJsonString.getBytes(StandardCharsets.UTF_8);

          // Send to all peers except the one we received from
          for (String peer : peerNids) {
            if (!peer.equals(senderNid)) {
              sender.send(floodBytes, peer);
            }
          }

          // Store the message in storage
          storage.put("last_message_from_" + senderNid, messageContent);

        } catch (InterruptedException e) {
          // This is fine - just continue the loop
          Thread.sleep(100);
        }
      }
    } catch (Exception e) {
      System.err.println("[FAILURE] " + myNid + ": Error in Flooding Algorithm: " + e.getMessage());
      e.printStackTrace();
    }
  }

  // Helper method to send initial message
  private void sendInitialMessage(String myNid, MessageSender sender, List<String> peerNids) {
    try {
      ObjectNode initialJson = objectMapper.createObjectNode();
      initialJson.put("content", "FLOODING_MESSAGE");
      initialJson.put("sequence", 0);
      initialJson.put("timestamp", System.currentTimeMillis());
      initialJson.put("originalSender", myNid);

      String initialJsonString = objectMapper.writeValueAsString(initialJson);
      byte[] initialBytes = initialJsonString.getBytes(StandardCharsets.UTF_8);

      // Send to all peers
      for (String peer : peerNids) {
        System.out.println("peer: " + peer);
        sender.send(initialBytes, peer);
      }

      System.out.println(myNid + ": Sent initial message to all peers");
    } catch (Exception e) {
      System.err.println("Error creating initial message: " + e.getMessage());
    }
  }

  @Override
  public String decodeMessage(byte[] raw_data) {
    ObjectMapper mapper = new ObjectMapper();

    // Parse and return JSON message
    try {
      Object obj = mapper.readValue(raw_data, Object.class);
      String jsonStr = mapper.writeValueAsString(obj);
      return jsonStr;
    } catch (Exception e) {
      e.printStackTrace();
      return null;
    }
  }
}
