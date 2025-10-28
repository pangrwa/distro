package com.example.programs;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import com.example.api.MessageReceiver;
import com.example.api.MessageSender;
import com.example.api.NodeProgram;
import com.example.api.Storage;
import com.example.util.Pair;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class LeaderElectionAlgorithm implements NodeProgram {
  private static final ObjectMapper objectMapper = new ObjectMapper();
  // Wrap around receive to make it non blocking
  private final ExecutorService executor = Executors.newSingleThreadExecutor();
  private volatile boolean isLeader = false;
  private volatile String myNidForHeartbeat = null;
  private volatile MessageSender senderForHeartbeat = null;
  private volatile List<String> peersForHeartbeat = null;
  private Thread heartbeatThread = null;

  @Override
  public void execute(List<String> peerNids, String myNid, MessageSender sender, MessageReceiver receiver,
      Storage storage) {
    try {
      System.out.println(myNid + ": Starting Leader Election Algorithm");
      int myId = extractNodeId(myNid);
      Set<String> failedNodes = new HashSet<>();
      String currentLeader = null;

      // simple time tracker to check whether leader is dead or not
      long now = System.currentTimeMillis();

      long timeout = 20000; // 20 seconds

      boolean is_leader = startElection(myNid, myId, sender, peerNids, failedNodes);
      updateLeaderStatus(is_leader, myNid, sender, peerNids);

      while (true) {
        try {
          // if i have a leader that i've not heard for more than 10 seconds, assume that
          // it died
          if (currentLeader != null && (System.currentTimeMillis() - now > 10000)) {
            System.out.println("MORE THAN 10 SECONDS, ASSUMING LEADER IS DEAD: " + currentLeader);
            failedNodes.add(currentLeader);
            currentLeader = null;
            is_leader = startElection(myNid, myId, sender, peerNids, failedNodes);
            updateLeaderStatus(is_leader, myNid, sender, peerNids);
            continue;
          }

          Pair<byte[], String> received = receivedWithTimeout(receiver, timeout);
          String senderNid = received.getRight();
          byte[] messageBytes = received.getLeft();

          if (currentLeader != null && senderNid.equals(currentLeader)) {
            now = System.currentTimeMillis();
          }

          // received a message from a dead node, bring him back
          if (failedNodes.contains(senderNid)) {
            failedNodes.remove(senderNid);
          }

          ObjectNode receivedJson = (ObjectNode) objectMapper.readTree(messageBytes);
          String messageType = receivedJson.get("type").asText();

          if ("ELECTION".equals(messageType)) {
            int senderId = receivedJson.get("senderID").asInt();
            // a smaller node starting an election, so I start mine too
            if (myId > senderId) {
              System.out.println(myNid + ": Bullying " + senderNid);
              sendOkMessage(myNid, myId, senderNid, sender);

              // wait for a second before starting my own election
              Thread.sleep(1000);
              is_leader = startElection(myNid, myId, sender, peerNids, failedNodes);
              updateLeaderStatus(is_leader, myNid, sender, peerNids);
            } else {
              // They have higher/equal ID, just acknowledge
              sendOkMessage(myNid, myId, senderNid, sender);
            }
          } else if ("OK".equals(messageType)) {
            // Got OK response from a higher node - clear timeout and wait for their
            // election
            System.out.println(myNid + ": Received OK, waiting for higher node to complete election");
          } else if ("LEADER".equals(messageType)) {
            // Leader announcement
            currentLeader = receivedJson.get("leaderId").asText();
            int leaderId = extractNodeId(currentLeader);

            // concede defeat to the new leader
            if (is_leader && leaderId > myId) {
              is_leader = false;
              updateLeaderStatus(false, myNid, sender, peerNids);
            }
            now = System.currentTimeMillis();
            System.out.println(myNid + ": " + currentLeader + " is the new leader");
          }

        } catch (TimeoutException e) {
          // did not receive any message from anybody, assume leader has failed and starts
          // re-election
          System.out
              .println("DID NOT RECEIVE MESSAGE FOR MORE THAN 10 SECONDS, ASSUMING LEADER IS DEAD: " + currentLeader);
          failedNodes.add(currentLeader);
          currentLeader = null;
          is_leader = startElection(myNid, myId, sender, peerNids, failedNodes);
          updateLeaderStatus(is_leader, myNid, sender, peerNids);
        } catch (InterruptedException e) {
          Thread.sleep(100);
        }

      }

    } catch (Exception e) {
      System.err.println("[FAILURE] " + myNid + ": Error in Echo Algorithm: " + e.getMessage());
      e.printStackTrace();
    }

  }

  private Pair<byte[], String> receivedWithTimeout(MessageReceiver receiver, long timeout) throws Exception {
    Future<Pair<byte[], String>> future = executor.submit(receiver::receive);
    return future.get(timeout, TimeUnit.MILLISECONDS);
  }

  private int extractNodeId(String nodeId) {
    try {
      String numericPart = nodeId.replaceAll("[^0-9]", "");
      return numericPart.isEmpty() ? 0 : Integer.parseInt(numericPart);
    } catch (NumberFormatException e) {
      return 0;
    }
  }

  private boolean startElection(String myNid, int myId, MessageSender sender, List<String> peerNids,
      Set<String> failedNodes) {
    try {
      ObjectNode electionJson = objectMapper.createObjectNode();
      electionJson.put("type", "ELECTION");
      electionJson.put("senderID", myId);
      electionJson.put("senderNid", myNid);

      String electionJsonString = objectMapper.writeValueAsString(electionJson);
      byte[] electionBytes = electionJsonString.getBytes(StandardCharsets.UTF_8);

      // send election message to all nodes with higher IDs
      boolean sentToHigher = false;
      for (String peer : peerNids) {
        int peerId = extractNodeId(peer);
        if (peerId > myId && !failedNodes.contains(peer)) {
          sender.send(electionBytes, peer);
          System.out.println(myNid + ": Sent Election to " + peer);
          sentToHigher = true;
        }
      }

      // assume leadership
      if (!sentToHigher) {
        System.out.println(myNid + " No active higher IDs - assuming that I'm the leader");
        announceLeadership(myNid, sender, peerNids);
        return true;
      }
      return false;
    } catch (Exception e) {
      System.err.println("Error starting election: " + e.getMessage());
      return false;
    }
  }

  private void announceLeadership(String myNid, MessageSender sender, List<String> peerNids) {
    try {
      ObjectNode leaderJson = objectMapper.createObjectNode();
      leaderJson.put("type", "LEADER");
      leaderJson.put("leaderId", myNid);

      String leaderJsonString = objectMapper.writeValueAsString(leaderJson);
      byte[] leaderBytes = leaderJsonString.getBytes(StandardCharsets.UTF_8);

      for (String peer : peerNids) {
        sender.send(leaderBytes, peer);
      }
      System.out.println(myNid + ": Announced leadership to all peers");
    } catch (Exception e) {
      System.err.println("Error announcing leadership: " + e.getMessage());
    }
  }

  private void sendOkMessage(String myNid, int myId, String recipient, MessageSender sender) {
    try {
      ObjectNode okJson = objectMapper.createObjectNode();
      okJson.put("type", "OK");
      okJson.put("senderId", myId);

      String okJsonString = objectMapper.writeValueAsString(okJson);
      byte[] okBytes = okJsonString.getBytes(StandardCharsets.UTF_8);

      sender.send(okBytes, recipient);
    } catch (Exception e) {
      System.err.println("Error sending OK message: " + e.getMessage());
    }
  }

  private synchronized void updateLeaderStatus(boolean newLeaderStatus, String myNid, MessageSender sender,
      List<String> peerNids) {
    if (newLeaderStatus && !isLeader) {
      // Became leader - start heartbeat thread
      isLeader = true;
      myNidForHeartbeat = myNid;
      senderForHeartbeat = sender;
      peersForHeartbeat = peerNids;

      heartbeatThread = new Thread(() -> runHeartbeat());
      heartbeatThread.setDaemon(true);
      heartbeatThread.start();
      System.out.println(myNid + ": Heartbeat thread started");
    } else if (!newLeaderStatus && isLeader) {
      // Lost leadership - stop heartbeat thread
      isLeader = false;
      if (heartbeatThread != null) {
        heartbeatThread.interrupt();
        heartbeatThread = null;
      }
      System.out.println(myNid + ": Heartbeat thread stopped");
    }
  }

  private void runHeartbeat() {
    long heartbeatIntervalMs = 5000; // 5 seconds

    while (isLeader && !Thread.currentThread().isInterrupted()) {
      try {
        Thread.sleep(heartbeatIntervalMs);

        if (isLeader && myNidForHeartbeat != null && senderForHeartbeat != null && peersForHeartbeat != null) {
          announceLeadership(myNidForHeartbeat, senderForHeartbeat, peersForHeartbeat);
        }
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        break;
      }
    }
  }

  @Override
  public String decodeMessage(byte[] rawData) {
    ObjectMapper mapper = new ObjectMapper();
    try {
      Object obj = mapper.readValue(rawData, Object.class); // Parse JSON
      String jsonStr = mapper.writeValueAsString(obj);
      return jsonStr;
    } catch (Exception e) {
      e.printStackTrace();
      return null;
    }
  }
}
