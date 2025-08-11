package com.example.util;

public class AnsiColor {

  public static final String RESET = "\u001B[0m";
  public static final String RED = "\u001B[31m";
  public static final String GREEN = "\u001B[32m";
  public static final String YELLOW = "\u001B[33m";

  public static String colorize(String text, String colorCode) {
    return colorCode + text + RESET;
  }
}
