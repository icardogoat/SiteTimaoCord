
'use client';

import { useState, useEffect, useRef } from "react";
import type { ApiSettings } from "@/types";
import { Badge } from "./ui/badge";

interface UpdateCountdownTimerProps {
  apiSettings: Partial<ApiSettings>;
}

const UPDATE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export function UpdateCountdownTimer({ apiSettings }: UpdateCountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('00:00');
  const nextUpdateTimestamp = useRef<number>(0);

  useEffect(() => {
    const lastUpdate = apiSettings.lastUpdateTimestamp
        ? new Date(apiSettings.lastUpdateTimestamp).getTime()
        : Date.now() - UPDATE_INTERVAL_MS; // If no timestamp, assume one just ran

    let nextUpdate = lastUpdate + UPDATE_INTERVAL_MS;
    
    // If the calculated next update is in the past (e.g., due to a long-running tab or delayed job),
    // keep adding intervals until it's in the future. This ensures sync.
    while (nextUpdate < Date.now()) {
        nextUpdate += UPDATE_INTERVAL_MS;
    }
    nextUpdateTimestamp.current = nextUpdate;

    const timer = setInterval(() => {
      const now = Date.now();
      const difference = nextUpdateTimestamp.current - now;

      if (difference <= 0) {
        // Time's up. The bot task should be running.
        // We'll show an "Updating..." message and then calculate the *next* next update time.
        setTimeLeft('Atualizando...');
        
        // Recalculate next update time to get back in sync for the next cycle
        let nextInterval = nextUpdateTimestamp.current;
        while (nextInterval <= now) {
            nextInterval += UPDATE_INTERVAL_MS;
        }
        nextUpdateTimestamp.current = nextInterval;
        return;
      }

      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [apiSettings]);
  
  return (
    <Badge variant="secondary" className="whitespace-nowrap">
      Jogos atualizam em: {timeLeft}
    </Badge>
  );
}
