"use client";

import { useEffect, useState } from "react";

interface DeliveryStatus {
  id: string;
  statut: "en_attente" | "assignee" | "en_route" | "livree" | "echec";
  livreur_latitude?: number;
  livreur_longitude?: number;
  livreur_location_updated_at?: string;
  distance_km?: number;
  estimated_arrival_at?: string;
  client_address_full?: string;
  client_telephone?: string;
}

interface ClientDeliveryTrackingProps {
  delivery: DeliveryStatus;
  onRefresh?: () => void;
}

export function ClientDeliveryTracking({
  delivery,
  onRefresh,
}: ClientDeliveryTrackingProps) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh?.();
    }, 10000);

    return () => clearInterval(interval);
  }, [onRefresh]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    onRefresh?.();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getStatusColor = () => {
    switch (delivery.statut) {
      case "en_attente":
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
      case "assignee":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "en_route":
        return "bg-orange-50 border-orange-200 text-orange-700";
      case "livree":
        return "bg-green-50 border-green-200 text-green-700";
      case "echec":
        return "bg-red-50 border-red-200 text-red-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  const getStatusLabel = () => {
    switch (delivery.statut) {
      case "en_attente":
        return "⏳ En attente de livreur";
      case "assignee":
        return "📦 Livreur assigné";
      case "en_route":
        return "🏍️ Livreur en route";
      case "livree":
        return "✅ Livrée";
      case "echec":
        return "❌ Livraison échouée";
      default:
        return "En cours...";
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg">{getStatusLabel()}</h3>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="text-sm font-semibold px-2 py-1 rounded bg-white/50 hover:bg-white disabled:opacity-50"
          >
            {refreshing ? "⟳" : "🔄"}
          </button>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-600 mb-1">Adresse de livraison:</p>
        <p className="font-semibold text-gray-800">
          {delivery.client_address_full || "Adresse en cours de chargement..."}
        </p>
      </div>

      {/* Tracking Info (when in route) */}
      {delivery.statut === "en_route" && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4 space-y-3">
          <h4 className="font-bold text-gray-800">🗺️ Localisation du livreur</h4>

          {/* Distance & ETA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Distance</p>
              <p className="text-xl font-black text-orange-600">
                {delivery.distance_km ? delivery.distance_km.toFixed(1) : "?"} km
              </p>
            </div>

            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Arrivée prévue</p>
              <p className="text-xs font-semibold text-gray-800">
                {delivery.estimated_arrival_at
                  ? new Date(delivery.estimated_arrival_at).toLocaleTimeString("fr-GA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "En calcul..."}
              </p>
            </div>
          </div>

          {/* Last Update */}
          <p className="text-xs text-gray-600 text-center">
            ⏱️ Dernière mise à jour:{" "}
            {delivery.livreur_location_updated_at
              ? new Date(delivery.livreur_location_updated_at).toLocaleTimeString("fr-GA", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "en attente..."}
          </p>
        </div>
      )}

      {/* Contact Livreur (when in route) */}
      {delivery.statut === "en_route" && delivery.client_telephone && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-2">📞 Vous pouvez appeler le livreur</p>
          <a
            href={`tel:${delivery.client_telephone}`}
            className="w-full block bg-blue-600 text-white font-bold py-2 rounded-lg text-center hover:bg-blue-700 transition-colors"
          >
            📞 Appeler le livreur
          </a>
        </div>
      )}

      {/* Auto-refresh indicator */}
      <p className="text-xs text-gray-500 text-center italic">
        🔄 Mise à jour automatique toutes les 10 secondes
      </p>
    </div>
  );
}
