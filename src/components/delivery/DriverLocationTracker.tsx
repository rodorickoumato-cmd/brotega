"use client";

import { useEffect, useState, useRef } from "react";

interface DeliveryLocation {
  livraisonId: string;
  clientLat: number;
  clientLng: number;
  clientAddress: string;
}

interface DriverLocationTrackerProps {
  delivery: DeliveryLocation;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export function DriverLocationTracker({
  delivery,
  onLocationUpdate,
}: DriverLocationTrackerProps) {
  const [driverLocation, setDriverLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [tracking, setTracking] = useState(true);
  const [distance, setDistance] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [speed, setSpeed] = useState(0);
  const watchIdRef = useRef<number | null>(null);

  // Start location tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    if (!tracking) return;

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords;

        setDriverLocation({ lat: latitude, lng: longitude });
        setAccuracy(Math.round(accuracy));
        setSpeed(speed ? Math.round(speed * 3.6) : 0); // Convert m/s to km/h

        // Calculate distance to client
        const dist = calculateDistance(
          latitude,
          longitude,
          delivery.clientLat,
          delivery.clientLng
        );
        setDistance(dist);

        // Notify parent
        onLocationUpdate?.(latitude, longitude);

        // Send to server (batch to avoid overload)
        sendLocationToServer(latitude, longitude, accuracy, speed || undefined);
      },
      (error) => {
        console.error("Location error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [tracking, delivery]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Send location to server
  const sendLocationToServer = async (
    lat: number,
    lng: number,
    accuracy: number,
    speed?: number
  ) => {
    try {
      await fetch(`/api/livraisons/${delivery.livraisonId}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          accuracy,
          speed,
        }),
      });
    } catch (error) {
      console.error("Failed to send location:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">📍 Suivi GPS</h3>
        <button
          onClick={() => setTracking(!tracking)}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
            tracking
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {tracking ? "🔴 En cours" : "⚫ Arrêté"}
        </button>
      </div>

      {/* Client Info */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-xs text-gray-600 mb-1">Destination:</p>
        <p className="font-semibold text-gray-800 text-sm">
          {delivery.clientAddress}
        </p>
      </div>

      {/* Current Location */}
      {driverLocation && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Distance */}
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded p-3">
              <p className="text-xs text-gray-600">Distance</p>
              <p className="text-2xl font-black text-blue-600">
                {distance.toFixed(1)}
                <span className="text-xs font-semibold"> km</span>
              </p>
            </div>

            {/* Speed */}
            <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded p-3">
              <p className="text-xs text-gray-600">Vitesse</p>
              <p className="text-2xl font-black text-orange-600">
                {speed}
                <span className="text-xs font-semibold"> km/h</span>
              </p>
            </div>
          </div>

          {/* Accuracy */}
          <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
            <p>📡 Précision: ±{accuracy}m</p>
            <p>
              📍 Coords: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
            </p>
          </div>
        </div>
      )}

      {!driverLocation && tracking && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 animate-pulse">
            ⏳ Localisation en cours...
          </p>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setTracking(!tracking)}
        className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
          tracking
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-green-600 text-white hover:bg-green-700"
        }`}
      >
        {tracking ? "⏹️ Arrêter le suivi" : "▶️ Démarrer le suivi"}
      </button>
    </div>
  );
}
