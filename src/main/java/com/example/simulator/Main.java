package com.example.simulator;

import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    if (args.length < 1) {
      System.err.println("Usage: java -jar simulator.jar <topology-file>");
      System.exit(1);
    }

    String topologyFile = args[0];
    DockerSimulator simulator = null;

    try {
      // Create and start simulator
      simulator = new DockerSimulator(topologyFile);
      simulator.startSimulation();

      // Add the option to cancel by ctr-c
      final DockerSimulator finalSimulator = simulator;
      Runtime.getRuntime().addShutdownHook(new Thread() {
        public void run() {
          System.out.println("\nShutdown signal received (Ctrl+C). Cleaning up resources...");
          finalSimulator.shutdown();

          System.out.println("Cleanup complete. Exiting.");
        }
      });

      // Simple command-line interface
      Scanner scanner = new Scanner(System.in);
      boolean running = true;

      System.out.println("\nSimulator is running. Available commands:");
      System.out.println("  pause <node-id>  - Pause a node");
      System.out.println("  resume <node-id> - Resume a paused node");
      System.out.println("  stop <node-id>   - Stop a node");
      System.out.println("  exit             - Exit the simulator");

      while (running) {
        System.out.print("> ");
        String command = scanner.nextLine().trim();

        if (command.equals("exit")) {
          running = false;
        } else if (command.startsWith("pause ")) {
          String nodeId = command.substring(6).trim();
          simulator.pauseNode(nodeId);
        } else if (command.startsWith("resume ")) {
          String nodeId = command.substring(7).trim();
          simulator.resumeNode(nodeId);
        } else if (command.startsWith("stop ")) {
          String nodeId = command.substring(5).trim();
          simulator.stopNode(nodeId);
        } else {
          System.out.println("Unknown command. Try pause, resume, stop, or exit.");
        }
      }

      scanner.close();
    } catch (Exception e) {
      e.printStackTrace();
    }
    // let the shutdown hook handle the shutting down instead
  }
}
