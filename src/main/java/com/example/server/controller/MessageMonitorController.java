package com.example.server.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.example.server.websocket.SimulationWebSocketHandler;

@RestController
public class MessageMonitorController {
  private static final Logger logger = LoggerFactory.getLogger(MessageMonitorController.class);

  @PostMapping("/message")
  public ResponseEntity<String> receiveMessage(@RequestBody String messageJson) {
    try {
      logger.info("Received message: {}", messageJson);

      // Broadcast the message to all connected WebSocket clients
      SimulationWebSocketHandler.broadcast(messageJson);

      return ResponseEntity.ok("Message received and broadcasted");
    } catch (Exception e) {
      logger.error("Error processing message: {}", e.getMessage());
      return ResponseEntity.status(500).body("Error processing message: " + e.getMessage());
    }
  }
}
