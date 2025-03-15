package com.example.util;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.example.api.Storage;

public class InMemoryStorage implements Storage {
    private final Map<String, Object> store = new ConcurrentHashMap<>();
    
    @Override
    public void put(String key, Object value) {
        store.put(key, value);
    }
    
    @Override
    public Object get(String key) {
        return store.get(key);
    }
    
    @Override
    public boolean containsKey(String key) {
        return store.containsKey(key);
    }
    
    @Override
    public void remove(String key) {
        store.remove(key);
    }
    
    @Override
    public void clear() {
        store.clear();
    }
    
    @Override
    public int size() {
        return store.size();
    }
    
    @Override
    public Map<String, Object> getAll() {
        return new HashMap<>(store);
    }
}
