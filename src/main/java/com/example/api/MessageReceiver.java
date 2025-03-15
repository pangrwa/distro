package com.example.api;

import com.example.util.Pair;

@FunctionalInterface
public interface MessageReceiver {
    Pair<byte[], String> receive() throws InterruptedException;
}
