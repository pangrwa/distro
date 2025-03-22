package com.example.programs;

import java.nio.charset.StandardCharsets;
import java.util.List;

import com.example.api.MessageReceiver;
import com.example.api.MessageSender;
import com.example.api.NodeProgram;
import com.example.api.Storage;
import com.example.util.Pair;

/**
 * A very basic algorithm that simply echoes back any message received
 * and periodically sends a heartbeat to its neighbors.
 */
public class EchoAlgorithm implements NodeProgram {
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
                long currentTime = System.currentTimeMillis();
                if (currentTime - lastHeartbeatTime > 5000) {
                    // Send a heartbeat to all peers
                    sendHeartbeat(myNid, sender, peerNids, heartbeatCount++);

                    lastHeartbeatTime = currentTime;
                }
                
                // Try to receive a message with a short timeout
                try {
                    // Try to receive with a 1-second timeout
                    Pair<byte[], String> received = receiver.receive();
                    String senderNid = received.getRight();
                    String message = new String(received.getLeft(), StandardCharsets.UTF_8);
                    
                    System.out.println(myNid + ": Received from " + senderNid + ": " + message);
                    
                    // Echo it back
                    String echoMessage = "ECHO: " + message;
                    sender.send(echoMessage.getBytes(StandardCharsets.UTF_8), senderNid);
                    System.out.println(myNid + ": Echoed back to " + senderNid);
                    
                    // Also store last message from each sender
                    storage.put("last_from_" + senderNid, message);

                    Thread.sleep(10000); // slow the process down
                } catch (InterruptedException e) {
                    // This is fine - just continue the loop
                    Thread.sleep(100);
                }
            }
        } catch (Exception e) {
            System.out.println("faield");
            System.err.println(myNid + ": Error in Echo Algorithm: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Helper method to send heartbeats
    private void sendHeartbeat(String myNid, MessageSender sender, List<String> peerNids, int count) {
        String heartbeatMsg = "HEARTBEAT-" + count + " from " + myNid;
        for (String peer : peerNids) {
            sender.send(heartbeatMsg.getBytes(StandardCharsets.UTF_8), peer);
            System.out.println(myNid + ": Sent heartbeat to " + peer);
        }
    }
}
