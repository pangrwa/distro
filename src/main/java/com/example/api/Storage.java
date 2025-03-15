package com.example.api;

import java.util.Map;

public interface Storage {
    void put(String key, Object value);
    Object get(String key);
    boolean containsKey(String key);
    void remove(String key);
    void clear();
    int size();
    Map<String, Object> getAll();
}
