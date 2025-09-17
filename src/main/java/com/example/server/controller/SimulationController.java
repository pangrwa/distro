package com.example.server.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import javax.annotation.PreDestroy;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.example.server.websocket.SimulationWebSocketHandler;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
public class SimulationController {
  private Process simulatorProcess;
  private File tempFile;
  private static final Logger logger = LoggerFactory.getLogger(SimulationController.class);

  @PostMapping("/api/simulation/start")
  public ResponseEntity<String> startSimulation(@RequestParam("file") MultipartFile file) {
    try {
      if (simulatorProcess != null) {
        return ResponseEntity.status(500)
            .body("Another process is running the simulation with config: " + tempFile.toString());
      }

      // Create docker images first
      runCommand("docker", "build", "-t", "distro/node", "-f", "docker/Dockerfile.node", ".");
      logger.info("Created docker images for nodes");

      tempFile = File.createTempFile("topology-", ".yaml");
      file.transferTo(tempFile);

      String topologyPath = tempFile.getAbsolutePath();

      ProcessBuilder pb = new ProcessBuilder(
          "java", "-jar", "target/simulator.jar", topologyPath, "server");

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
      logger.info("Simulation started with config: {}", topologyPath);

      return ResponseEntity.ok("Simulation started with config: " + tempFile.toString());
    } catch (IOException | InterruptedException e) {
      String errorMsg = "Failed to start simulation: " + e.getMessage();
      return ResponseEntity.status(500).body(errorMsg);
    }
  }

  @PostMapping("/api/simulation/stop")
  public ResponseEntity<String> stopSimulation() {
    try {
      if (simulatorProcess == null) {
        return ResponseEntity.status(500).body("There is not simulation running");
      }
      long pid = simulatorProcess.pid();
      ProcessBuilder pb = new ProcessBuilder("kill", "-SIGINT", Long.toString(pid));
      Process killProcess = pb.start();
      killProcess.waitFor();
      simulatorProcess.waitFor();
      if (tempFile != null && tempFile.exists()) {
        tempFile.deleteOnExit();
      }
      logger.info("Simulation stopped");

      return ResponseEntity.ok("Simulation stopped");
    } catch (Exception e) {
      String errorMsg = "Simulation stopped but not intentional: " + e.getMessage();
      return ResponseEntity.ok(errorMsg);
    }
  }

  private static void runCommand(String... command) throws IOException, InterruptedException {
    ProcessBuilder pb = new ProcessBuilder(command);
    pb.redirectErrorStream(true);

    Process process = pb.start();

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

  @PreDestroy
  public void cleanup() {
    try {
      if (simulatorProcess != null && simulatorProcess.isAlive()) {
        logger.info("Shutting down simulator process during server shutdown");
        long pid = simulatorProcess.pid();
        ProcessBuilder pb = new ProcessBuilder("kill", "-SIGINT", Long.toString(pid));
        Process killProcess = pb.start();
        killProcess.waitFor();
        simulatorProcess.waitFor();
      }
      if (tempFile != null && tempFile.exists()) {
        tempFile.deleteOnExit();
      }
      logger.info("Cleanup completed");
    } catch (Exception e) {
      logger.error("Error during cleanup: " + e.getMessage(), e);
    }
  }
}
