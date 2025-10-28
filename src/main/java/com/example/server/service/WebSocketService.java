// package com.example.server.service;
//
// import org.springframework.stereotype.Service;
// import com.example.server.websocket.SimulationWebSocketHandler;
//
// @Service
// public class WebSocketService {
//
// public void broadcastSimulationStatus(String message) {
// SimulationWebSocketHandler.broadcast(message);
// }
//
// public void broadcastError(String error) {
// SimulationWebSocketHandler.broadcast("ERROR: " + error);
// }
//
// public void broadcastSimulationStart(String config) {
// SimulationWebSocketHandler.broadcast("SIMULATION_STARTED: " + config);
// }
//
// public void broadcastSimulationStop() {
// SimulationWebSocketHandler.broadcast("SIMULATION_STOPPED");
// }
//
// public void broadcastDockerImageCreated(String imageName) {
// SimulationWebSocketHandler.broadcast("DOCKER_IMAGE_CREATED: " + imageName);
// }
// }
