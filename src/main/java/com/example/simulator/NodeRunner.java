package com.example.simulator;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.Arrays;
import java.util.List;

import com.example.api.MessageReceiver;
import com.example.api.MessageSender;
import com.example.api.NodeProgram;
import com.example.api.Storage;
import com.example.programs.EchoAlgorithm;
import com.example.util.InMemoryStorage;
import com.example.util.Pair;

public class NodeRunner {
    private static final int UDP_PORT = 8888;

    public static void main(String[] args) throws Exception {
        // Get configuration from environment variables, these would have been set from the docker containers
        String nodeId = System.getenv("NODE_ID");
        String programName = System.getenv("PROGRAM_NAME");
        String peerNodesStr = System.getenv("PEER_NODES");

        List<String> peerNodeIds = Arrays.asList(peerNodesStr.split(","));

        System.out.println("Starting node " + nodeId + " with program " + programName);
        System.out.println("Peer nodes: " + peerNodesStr);


        // maybe we can consider using TCP and then create our own jitter channel
        DatagramSocket socket = new DatagramSocket(UDP_PORT);

        MessageSender sender = createMessageSender(socket);
        MessageReceiver receiver = createMessageReceiver(socket);

        NodeProgram program = loadProgram(programName);

        Storage storage = new InMemoryStorage();

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

    private static MessageSender createMessageSender(DatagramSocket socket) {
        return (message, recipientNid) -> {
            try {
                InetAddress address = InetAddress.getByName(recipientNid);
                DatagramPacket packet = new DatagramPacket(message, message.length, address, UDP_PORT);
                
                socket.send(packet);
            } catch (Exception e) {
                System.err.println("Error sending message to " + recipientNid + ": " + e.getMessage());
            }
        };
    }

    private static MessageReceiver createMessageReceiver(DatagramSocket socket) {
        return () -> {
            try {
                byte[] buffer = new byte[1024];
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                socket.receive(packet);

                String senderHostname = packet.getAddress().getHostName();

                return new Pair<byte[],String>(Arrays.copyOf(buffer, packet.getLength()),
                senderHostname);

            } catch (Exception e) {
                System.err.println("Error receiving message: " + e.getMessage());
                throw new InterruptedException("Socket receive interrupted");
            }
        };
    }
}
