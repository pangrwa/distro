package com.example.api;

import java.util.List;

import com.example.util.Pair;

public interface NodeProgram {
  void execute(List<String> peerNids, String myNid,
      MessageSender sender, MessageReceiver receiver,
      Storage storage);

  String decodeMessage(byte[] raw_data);

}
