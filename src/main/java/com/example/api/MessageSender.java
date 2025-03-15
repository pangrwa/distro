package com.example.api;

@FunctionalInterface
public interface MessageSender {
    void send(byte[] message, String recipentNid);
}
