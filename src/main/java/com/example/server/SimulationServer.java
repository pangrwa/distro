package com.example.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;

import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;

import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@SpringBootApplication
@EnableWebSocket
public class SimulationServer {

  public static void main(String[] args) {
    SpringApplication.run(SimulationServer.class, args);
  }

  @org.springframework.web.bind.annotation.RestController
  public static class SimulationController {
    private Process simulatorProcess;
    private File tempFile;
    private static final Logger logger = LoggerFactory.getLogger(SimulationController.class);
    // private final WebSocketHandler wsHandler;

    // TODO: Simulator might crash and the server might not report to the client -
    // maybe create a health ping?
    @PostMapping("/api/simulation/start")
    public ResponseEntity<String> startSimulation(@RequestParam("file") MultipartFile file) {
      // Save topology to temporary YAML file
      try {
        if (simulatorProcess != null) {
          return ResponseEntity.status(500)
              .body("Another process is running the simulation with config: " + tempFile.toString());

        }
        // create docker images first
        runCommand("docker", "build", "-t", "distro/node", "-f", "docker/Dockerfile.node", ".");
        // TODO: for now can remove later dont really need message monitor anymore as a
        // container
        runCommand("docker", "build", "-t", "distro/message-monitor", "-f", "docker/Dockerfile.message-monitor", ".");
        logger.info("Created docker images for nodes");

        tempFile = File.createTempFile("topology-", ".yaml");
        file.transferTo(tempFile);

        // get the path
        String topologyPath = tempFile.getAbsolutePath();

        // start the simulator process
        ProcessBuilder pb = new ProcessBuilder(
            "java", "-jar", "target/simulator.jar", topologyPath);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");
        String timestamp = LocalDateTime.now().format(formatter);
        File logDir = new File(".server-logs");
        if (!logDir.exists()) {
          logDir.mkdir();
        }
        File logFile = new File(logDir, "simulator_" + timestamp + ".log");
        pb.redirectOutput(ProcessBuilder.Redirect.appendTo(logFile));
        pb.redirectError(ProcessBuilder.Redirect.appendTo(logFile));

        simulatorProcess = pb.start();
        logger.info("Simualation started with config: {}", topologyPath);

        // Capture output for commands
        // handleSimulatorOutput(simulatorProcess);

        return ResponseEntity.ok("Simulation started with config: " + tempFile.toString());
      } catch (IOException | InterruptedException e) {
        return ResponseEntity.status(500).body("Failed to start simulation: " + e.getMessage());
      }
    }

    // @PostMapping("/api/simulation/command")
    // public ResponseEntity<String> sendCommand(@RequestBody SimCommand command) {
    // // Send command to simulator process stdin
    // if (simulatorProcess != null) {
    // PrintWriter writer = new PrintWriter(simulatorProcess.getOutputStream());
    // writer.println(command.getCommand());
    // writer.flush();
    // }
    // return ResponseEntity.ok("Command sent");
    // }
    //
    @PostMapping("/api/simulation/stop")
    public ResponseEntity<String> stopSimulation() {
      try {
        if (simulatorProcess != null) {
          // simulatorProcess.destroy();
          long pid = simulatorProcess.pid();
          ProcessBuilder pb = new ProcessBuilder("kill", "-SIGINT", Long.toString(pid));
          Process killProcess = pb.start();
          killProcess.waitFor();
          simulatorProcess.waitFor();
        }
        if (tempFile.exists()) {
          tempFile.deleteOnExit();
        }
        logger.info("Simulation stopped");

        return ResponseEntity.ok("Simulation stopped");
      } catch (Exception e) {
        return ResponseEntity.ok("Simulation stopped but not intentional: " + e.getMessage());
      }
    }

    private static void runCommand(String... command) throws IOException, InterruptedException {
      ProcessBuilder pb = new ProcessBuilder(command);
      pb.redirectErrorStream(true); // Merge stdout and stderr

      Process process = pb.start();

      // Read the output of the command
      try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
        String line;
        while ((line = reader.readLine()) != null) {
          System.out.println(line);
        }
      }

      int exitCode = process.waitFor();
      if (exitCode != 0) {
        System.err.println("Command exited with code " + exitCode);
      }
    }
  }
}
