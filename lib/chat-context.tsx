"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { Workout } from "./types";

interface ChatContextValue {
  attachedWorkout: Workout | null;
  attachWorkout: (workout: Workout) => void;
  clearAttachment: () => void;
}

const ChatContext = createContext<ChatContextValue>({
  attachedWorkout: null,
  attachWorkout: () => {},
  clearAttachment: () => {},
});

export function ChatContextProvider({ children }: { children: React.ReactNode }) {
  const [attachedWorkout, setAttachedWorkout] = useState<Workout | null>(null);

  const attachWorkout = useCallback((workout: Workout) => {
    setAttachedWorkout(workout);
  }, []);

  const clearAttachment = useCallback(() => {
    setAttachedWorkout(null);
  }, []);

  return (
    <ChatContext.Provider value={{ attachedWorkout, attachWorkout, clearAttachment }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatContext);
}
