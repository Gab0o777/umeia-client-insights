// Hook que simula tráfico en vivo: incrementa mensajes y refresca "última sync"
import { useEffect, useState } from "react";

export function useLiveTraffic(initial: number) {
  const [messages, setMessages] = useState(initial);
  const [lastSync, setLastSync] = useState(0); // segundos transcurridos

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessages((m) => m + Math.floor(Math.random() * 3) + 1);
    }, 3500);
    const syncInterval = setInterval(() => {
      setLastSync((s) => (s + 1) % 180);
    }, 1000);
    return () => {
      clearInterval(msgInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const syncLabel = lastSync < 60 ? `hace ${lastSync}s` : `hace ${Math.floor(lastSync / 60)} min`;
  return { messages, syncLabel };
}
