"use client";
import { useState, useEffect } from "react";

export function useOnline(): boolean {
  const [enLigne, setEnLigne] = useState(true);

  useEffect(() => {
    // Initialise avec l'état réel
    setEnLigne(navigator.onLine);

    const goOnline = () => setEnLigne(true);
    const goOffline = () => setEnLigne(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return enLigne;
}
