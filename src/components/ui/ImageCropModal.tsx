"use client";
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

// Extrait la zone rognée dans un File JPEG
async function rognerImage(src: string, zone: Area): Promise<File> {
  const img = new window.Image();
  img.src = src;
  await new Promise<void>((res) => { img.onload = () => res(); });

  const canvas = document.createElement("canvas");
  canvas.width  = zone.width;
  canvas.height = zone.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, zone.x, zone.y, zone.width, zone.height, 0, 0, zone.width, zone.height);

  return new Promise<File>((res) => {
    canvas.toBlob(
      (blob) => res(new File([blob!], "produit.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      0.95
    );
  });
}

type Props = {
  src: string;
  onConfirm: (fichier: File) => void;
  onAnnuler: () => void;
};

export function ImageCropModal({ src, onConfirm, onAnnuler }: Props) {
  const [crop,   setCrop]   = useState({ x: 0, y: 0 });
  const [zoom,   setZoom]   = useState(1);
  const [zonePixels, setZonePixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);

  const onCropComplete = useCallback((_: Area, zonesPixels: Area) => {
    setZonePixels(zonesPixels);
  }, []);

  const valider = async () => {
    if (!zonePixels) return;
    setLoading(true);
    const fichier = await rognerImage(src, zonePixels);
    onConfirm(fichier);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* En-tête */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 flex-shrink-0">
        <button
          onClick={onAnnuler}
          className="text-white/70 text-sm font-medium py-2 px-3"
        >
          Annuler
        </button>
        <p className="text-white text-sm font-black">Centrer le produit</p>
        <button
          onClick={valider}
          disabled={loading}
          className="bg-[#E63946] text-white text-sm font-black py-2 px-4 rounded-xl disabled:opacity-50"
        >
          {loading ? "…" : "Valider"}
        </button>
      </div>

      {/* Zone de crop */}
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={false}
          style={{
            containerStyle: { background: "#000" },
            cropAreaStyle: { border: "3px solid #E63946", borderRadius: 16 },
          }}
        />
      </div>

      {/* Slider zoom */}
      <div className="bg-black/80 px-6 py-4 flex-shrink-0 flex items-center gap-4">
        <span className="text-white/60 text-xs">🔍</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-[#E63946] h-1"
          aria-label="Zoom"
        />
        <span className="text-white/60 text-xs">🔎</span>
      </div>

      <p className="text-center text-white/40 text-xs pb-3 bg-black/80">
        Déplacez et zoomez pour bien centrer votre produit
      </p>
    </div>
  );
}
