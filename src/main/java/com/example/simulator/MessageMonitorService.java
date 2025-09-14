package com.example.simulator;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.WebSocketAdapter;
import org.eclipse.jetty.websocket.server.config.JettyWebSocketServletContainerInitializer;

import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MessageMonitorService {
  private final int httpPort;
  private final int wsPort;

  private final Server httpServer;
  private final Server wsServer;

  private static final Logger logger = LoggerFactory.getLogger(MessageMonitorService.class);
  private final Set<Session> webSocketSessions = ConcurrentHashMap.newKeySet();

  public static void main(String[] args) throws Exception {
    // Start Message Monitor Service
    MessageMonitorService monitorService = new MessageMonitorService(8090, 8091);

    try {
      monitorService.start();
    } catch (Exception e) {
      logger.error("MonitorService Failed to start: {}", e.getMessage());
      return;
    }

    // Add shutdown hook
    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
      if (monitorService != null) {
        try {
          monitorService.stop();
        } catch (Exception e) {
          System.out.println("MonitorService didn't stop properly");
        }
      }
    }));
  }

  public MessageMonitorService(int httpPort, int wsPort) {
    this.httpPort = httpPort;
    this.wsPort = wsPort;
    this.httpServer = new Server(httpPort);
    this.wsServer = new Server(wsPort);
  }

  public void start() throws Exception {
    // setup http server for receiving messages from containers
    ServletContextHandler httpContext = new ServletContextHandler();
    httpContext.setContextPath("/");
    httpContext.addServlet(new ServletHolder(new MessageReceiver()), "/message");
    httpServer.setHandler(httpContext);

    // setup websocket

    ServletContextHandler wsContext = new ServletContextHandler(ServletContextHandler.SESSIONS);
    wsContext.setContextPath("/");
    wsServer.setHandler(wsContext);
    JettyWebSocketServletContainerInitializer.configure(wsContext, (servletContext, wsContainer) -> {
      // Register your WebSocket endpoint
      wsContainer.addMapping("/ws", (req, resp) -> new FrontendWebSocket());
    });

    logger.info("MessageMonitorService HTTP Server has started...");
    logger.info("MessageMonitorService WS Server for frontend has started...");
    httpServer.start();
    wsServer.start();
  }

  public void stop() throws Exception {
    httpServer.stop();
    wsServer.stop();
  }

  private void broadcastToWebSockets(String message) {
    logger.info("Attempting to broadcast to websocket: {}", message);
    webSocketSessions.removeIf(session -> !session.isOpen());

    for (Session session : webSocketSessions) {
      try {
        session.getRemote().sendString(message);
      } catch (IOException e) {
        logger.error("Failed to send to Websocket: {}. Error: {}", session.getRemoteAddress().toString(),
            e.getMessage());
      }
    }
  }

  private class MessageReceiver extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
      StringBuilder sb = new StringBuilder();
      try (BufferedReader reader = req.getReader()) {
        String line;
        while ((line = reader.readLine()) != null) {
          sb.append(line);
        }
      }

      String messageJson = sb.toString();

      broadcastToWebSockets(messageJson);
      resp.setStatus(HttpServletResponse.SC_OK);

    }
  }

  private class FrontendWebSocket extends WebSocketAdapter {
    @Override
    public void onWebSocketConnect(Session session) {
      super.onWebSocketConnect(session);
      webSocketSessions.add(session);

      logger.info("Frontend: {} connected via WebSocket", session.getRemoteAddress().toString());
    }

    @Override
    public void onWebSocketClose(int statusCode, String reason) {
      super.onWebSocketClose(statusCode, reason);
      webSocketSessions.remove(getSession());

      logger.info("Frontend: {} disconnected", getSession().getRemoteAddress().toString());
    }

    // @Override
    // public
  }

}
