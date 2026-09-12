"use client";

import { useState, useEffect } from "react";

interface LocationData {
  address: string;
  ville: string;
  quartier: string;
  details: string;
  latitude?: number;
  longitude?: number;
}

interface LocationSelectorProps {
  onLocationChange?: (location: LocationData) => void;
  initialLocation?: LocationData;
}

export function LocationSelector({
  onLocationChange,
  initialLocation,
}: LocationSelectorProps) {
  const [location, setLocation] = useState<LocationData>(
    initialLocation || {
      address: "",
      ville: "Libreville",
      quartier: "",
      details: "",
    }
  );

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [showGPS, setShowGPS] = useState(false);

  const cities = [
    "Libreville",
    "Port-Gentil",
    "Franceville",
    "Oyem",
    "Lambaréné",
    "Mouila",
    "Makokou",
    "Gamba",
  ];

  // Get current GPS location
  const handleGetGPS = async () => {
    if (!navigator.geolocation) {
      setGpsError("Géolocalisation non supportée par votre navigateur");
      return;
    }

    setGpsLoading(true);
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          ...location,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGpsLoading(false);
        setShowGPS(false);
      },
      (error) => {
        setGpsError("Erreur géolocalisation. Vérifiez les permissions.");
        setGpsLoading(false);
        console.error(error);
      }
    );
  };

  // Notify parent of changes
  useEffect(() => {
    onLocationChange?.(location);
  }, [location]);

  return (
    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📍</span>
        <h3 className="font-bold text-gray-800">Adresse de livraison</h3>
      </div>

      {/* Address Field */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Adresse complète
        </label>
        <input
          type="text"
          value={location.address}
          onChange={(e) => setLocation({ ...location, address: e.target.value })}
          placeholder="Ex: Rue de la Paix, 123"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* City & Quartier */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Ville
          </label>
          <select
            value={location.ville}
            onChange={(e) => setLocation({ ...location, ville: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Quartier
          </label>
          <input
            type="text"
            value={location.quartier}
            onChange={(e) =>
              setLocation({ ...location, quartier: e.target.value })
            }
            placeholder="Ex: Akanda"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Details */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Instructions supplémentaires (optionnel)
        </label>
        <textarea
          value={location.details}
          onChange={(e) => setLocation({ ...location, details: e.target.value })}
          placeholder="Ex: Étage 2, portail bleu, digicode 4567"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
        />
      </div>

      {/* GPS Button */}
      <button
        type="button"
        onClick={handleGetGPS}
        disabled={gpsLoading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {gpsLoading ? (
          <>
            <span className="animate-spin">⏳</span>
            Géolocalisation...
          </>
        ) : (
          <>
            <span>📡</span>
            Utiliser ma localisation GPS
          </>
        )}
      </button>

      {/* GPS Status */}
      {location.latitude && location.longitude && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-sm">
          <p className="text-green-700">
            ✓ GPS capturé: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </p>
        </div>
      )}

      {gpsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-sm">
          <p className="text-red-700">⚠️ {gpsError}</p>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-gray-600 italic">
        💡 La localisation aide le livreur à vous trouver plus rapidement. Le GPS n'est pas obligatoire.
      </p>
    </div>
  );
}
