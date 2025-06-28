
'use client';

import { useState, useEffect } from "react";
import type { ApiSettings } from "@/types";
import { Badge } from "./ui/badge";

interface UpdateCountdownTimerProps {
  apiSettings: Partial<ApiSettings>;
}

const UPDATE_INTERVAL_BASE_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export function UpdateCountdownTimer({ apiSettings }: UpdateCountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('00:00');
  let nextUpdateRef = new Date();

  useEffect(() => {
    const keyCount = apiSettings.updateApiKeys?.length || 1;
    const intervalMs = UPDATE_INTERVAL_BASE_MS / keyCount;
    const lastUpdate = apiSettings.lastUpdateTimestamp 
        ? new Date(apiSettings.lastUpdateTimestamp) 
        : new Date(Date.now() - intervalMs); // Assume last update was one interval ago if not set

    nextUpdateRef = new Date(lastUpdate.getTime() + intervalMs);

    const timer = setInterval(() => {
      const now = new Date();
      let difference = nextUpdateRef.getTime() - now.getTime();
      
      if (difference <= 0) {
        setTimeLeft('Atualizando...');
        // Set the next update time for the next cycle
        nextUpdateRef = new Date(nextUpdateRef.getTime() + intervalMs);
        difference = nextUpdateRef.getTime() - now.getTime();
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
