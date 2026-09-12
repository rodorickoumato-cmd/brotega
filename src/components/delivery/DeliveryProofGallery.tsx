"use client";

import { useState } from "react";

interface DeliveryPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
  description?: string;
  taken_at: string;
  verified_by_admin?: boolean;
}

interface DeliveryProofGalleryProps {
  photos: DeliveryPhoto[];
  livraisonId: string;
  showVerification?: boolean;
}

export function DeliveryProofGallery({
  photos,
  livraisonId,
  showVerification = false,
}: DeliveryProofGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<DeliveryPhoto | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  if (!photos || photos.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <p className="text-gray-600">📸 Aucune photo de confirmation</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Gallery */}
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
            onClick={() => {
              setSelectedPhoto(photo);
              setFullscreenOpen(true);
            }}
          >
            <img
              src={photo.photo_url}
              alt={photo.description || "Photo livraison"}
              className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-200"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

            {/* Type badge */}
            <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-xs font-semibold text-gray-800">
              {photo.photo_type === "delivery" ? "📦 Livraison" : photo.photo_type}
            </div>

            {/* Verified badge */}
            {photo.verified_by_admin && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                ✅ Vérifié
              </div>
            )}

            {/* Timestamp */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs p-2">
              {new Date(photo.taken_at).toLocaleString("fr-GA", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      {fullscreenOpen && selectedPhoto && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenOpen(false)}
        >
          <div className="max-w-2xl w-full space-y-4">
            {/* Image */}
            <img
              src={selectedPhoto.photo_url}
              alt={selectedPhoto.description || "Photo livraison"}
              className="w-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Info */}
            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">
                  {selectedPhoto.photo_type === "delivery"
                    ? "📦 Photo de livraison"
                    : selectedPhoto.photo_type}
                </span>
                {selectedPhoto.verified_by_admin && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                    ✅ Vérifié par admin
                  </span>
                )}
              </div>

              {selectedPhoto.description && (
                <p className="text-sm text-gray-600">{selectedPhoto.description}</p>
              )}

              <p className="text-xs text-gray-500">
                📅{" "}
                {new Date(selectedPhoto.taken_at).toLocaleString("fr-GA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => setFullscreenOpen(false)}
              className="w-full bg-red-600 text-white font-bold py-2 rounded-lg"
            >
              ✕ Fermer
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-700">
          📸 {photos.length} photo{photos.length > 1 ? "s" : ""} de confirmation
          {photos.filter((p) => p.verified_by_admin).length > 0 &&
            ` - ${photos.filter((p) => p.verified_by_admin).length} vérifié${
              photos.filter((p) => p.verified_by_admin).length > 1 ? "es" : ""
            } par admin`}
        </p>
      </div>
    </div>
  );
}
