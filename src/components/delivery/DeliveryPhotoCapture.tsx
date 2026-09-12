"use client";

import { useEffect, useRef, useState } from "react";

interface DeliveryPhotoCaptureProps {
  livraisonId: string;
  onPhotoCapture?: (photoData: string) => void;
  onPhotoUpload?: (photoUrl: string) => Promise<void>;
}

export function DeliveryPhotoCapture({
  livraisonId,
  onPhotoCapture,
  onPhotoUpload,
}: DeliveryPhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Start camera
  const startCamera = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError("Erreur accès caméra. Vérifiez les permissions.");
      console.error(err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    setCameraActive(false);
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    context.drawImage(videoRef.current, 0, 0);
    const photoData = canvasRef.current.toDataURL("image/jpeg");

    setCapturedPhoto(photoData);
    stopCamera();
    onPhotoCapture?.(photoData);
  };

  // Upload photo
  const uploadPhoto = async () => {
    if (!capturedPhoto) return;

    setUploading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();

      // Create FormData for upload
      const formData = new FormData();
      formData.append("file", blob, `delivery-${livraisonId}.jpg`);
      formData.append("livraison_id", livraisonId);

      // Send to server
      const uploadRes = await fetch("/api/livraisons/photos/upload", {
        method: "POST",
        body: formData,
      });

      const result = await uploadRes.json() as { url?: string; erreur?: string };

      if (result.erreur) {
        setError(result.erreur);
        return;
      }

      if (result.url) {
        await onPhotoUpload?.(result.url);
        setCapturedPhoto(null);
      }
    } catch (err) {
      setError("Erreur upload photo");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // File upload fallback
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const photoData = ev.target?.result as string;
      setCapturedPhoto(photoData);
      onPhotoCapture?.(photoData);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white border-2 border-orange-200 rounded-lg p-4 space-y-3">
      <h3 className="font-bold text-gray-800 flex items-center gap-2">
        📸 Photo de confirmation
      </h3>

      {/* Camera View */}
      {cameraActive ? (
        <div className="space-y-2">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg bg-black"
            style={{ maxHeight: "300px" }}
          />
          <div className="flex gap-2">
            <button
              onClick={capturePhoto}
              className="flex-1 bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              📷 Prendre photo
            </button>
            <button
              onClick={stopCamera}
              className="flex-1 bg-gray-300 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              ✕ Annuler
            </button>
          </div>
        </div>
      ) : capturedPhoto ? (
        <div className="space-y-2">
          <img
            src={capturedPhoto}
            alt="Photo prise"
            className="w-full rounded-lg"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCapturedPhoto(null);
                startCamera();
              }}
              className="flex-1 bg-gray-300 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-400"
            >
              📷 Reprendre
            </button>
            <button
              onClick={uploadPhoto}
              disabled={uploading}
              className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? "Upload..." : "✅ Valider"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={startCamera}
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition-colors"
          >
            📷 Ouvrir caméra
          </button>

          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-orange-600 text-orange-600 font-bold py-2 rounded-lg hover:bg-orange-50 transition-colors"
            >
              📁 Galerie photos
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <p className="text-sm text-red-700">⚠️ {error}</p>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-gray-600 italic">
        💡 Prenez une photo du colis livré pour confirmation. Le vendeur et le client la verront.
      </p>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
