package com.example.server.websocket;

import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.CopyOnWriteArraySet;

public class SimulationWebSocketHandler extends TextWebSocketHandler {
  private static final Logger logger = LoggerFactory.getLogger(SimulationWebSocketHandler.class);
  private static final CopyOnWriteArraySet<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws Exception {
    sessions.add(session);
    logger.info("WebSocket connection established: {}", session.getId());
    session.sendMessage(new TextMessage("Connected to simulation WebSocket"));
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    logger.info("Received message from {}: {}", session.getId(), message.getPayload());
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status)
      throws Exception {
    sessions.remove(session);
    logger.info("WebSocket connection closed: {}", session.getId());
  }

  public static void broadcast(String message) {
    for (WebSocketSession session : sessions) {
      if (session.isOpen()) {
        synchronized (session) {
          try {
            session.sendMessage(new TextMessage(message));
          } catch (Exception e) {
            logger.error("Error broadcasting to session {}: {}", session.getId(), e.getMessage());
          }
        }
      }
    }
  }
}
