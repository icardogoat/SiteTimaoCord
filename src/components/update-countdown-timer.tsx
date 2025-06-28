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
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const keyCount = apiSettings.apiKeys?.length || 1;
    const intervalMs = UPDATE_INTERVAL_BASE_MS / keyCount;
    const lastUpdate = apiSettings.lastUpdateTimestamp 
        ? new Date(apiSettings.lastUpdateTimestamp) 
        : new Date(Date.now() - intervalMs); // Assume last update was one interval ago if not set

    const nextUpdateTime = new Date(lastUpdate.getTime() + intervalMs);
    setNextUpdate(nextUpdateTime);

    const timer = setInterval(() => {
      const now = new Date();
      const difference = nextUpdateTime.getTime() - now.getTime();
      
      if (difference <= 0) {
        setTimeLeft('Atualizando...');
        // Refresh the page or relevant data after a delay
        setTimeout(() => window.location.reload(), 5000);
        clearInterval(timer);
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
      Próxima atualização em: {timeLeft}
    </Badge>
  );
}
