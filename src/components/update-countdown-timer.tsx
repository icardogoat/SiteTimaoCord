
'use client';

import { useState, useEffect, useRef } from "react";
import type { ApiSettings } from "@/types";
import { Badge } from "./ui/badge";

interface UpdateCountdownTimerProps {
  apiSettings: Partial<ApiSettings>;
}

const UPDATE_INTERVAL_BASE_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export function UpdateCountdownTimer({ apiSettings }: UpdateCountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('00:00');
  const nextUpdateTimestamp = useRef<number>(0);

  useEffect(() => {
    // This effect calculates the next update time whenever apiSettings change.
    const keyCount = Math.max(1, apiSettings.updateApiKeys?.length || 1);
    const intervalMs = UPDATE_INTERVAL_BASE_MS / keyCount;
    const lastUpdate = apiSettings.lastUpdateTimestamp
        ? new Date(apiSettings.lastUpdateTimestamp).getTime()
        : Date.now() - intervalMs;

    let nextUpdate = lastUpdate + intervalMs;
    // If the calculated next update is in the past (e.g., due to a long-running tab),
    // keep adding intervals until it's in the future.
    while (nextUpdate < Date.now()) {
        nextUpdate += intervalMs;
    }
    nextUpdateTimestamp.current = nextUpdate;

    // This effect also runs the timer. We include it here so it restarts with the correct
    // nextUpdateTimestamp if the apiSettings change.
    const timer = setInterval(() => {
      const now = Date.now();
      const difference = nextUpdateTimestamp.current - now;

      if (difference <= 0) {
        // Time's up. The cron job should be running.
        // We'll show an "Updating..." message and then calculate the *next* next update time.
        setTimeLeft('Atualizando...');
        let nextInterval = nextUpdateTimestamp.current;
        while (nextInterval <= now) {
            nextInterval += intervalMs;
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
