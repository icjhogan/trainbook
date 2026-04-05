"use client";

import { createContext, useContext } from "react";

export const ChatOpenerContext = createContext<() => void>(() => {});

export function useChatOpener() {
  return useContext(ChatOpenerContext);
}
