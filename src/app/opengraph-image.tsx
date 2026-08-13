import { ImageResponse } from "next/og";

// Image de partage par défaut (og:image / twitter:image) pour toute page qui
// n'a pas la sienne — les pages produit la surchargent avec leur propre
// photo (voir generateMetadata dans produit/[slug]/page.tsx). Générée à la
// volée, pas de fichier binaire à maintenir dans le repo.
export const runtime = "edge";
export const alt = "J'adore la Famille — La Marketplace du Gabon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#E63946",
          position: "relative",
        }}
      >
        {/* Cercles décoratifs discrets */}
        <div style={{
          position: "absolute", top: -80, right: -80, width: 320, height: 320,
          borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: -120, left: -100, width: 380, height: 380,
          borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex",
        }} />

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 140, height: 140, borderRadius: 32, background: "rgba(255,255,255,0.15)",
          marginBottom: 36,
        }}>
          <span style={{ fontSize: 76 }}>🛍️</span>
        </div>

        <div style={{
          display: "flex", fontSize: 76, fontWeight: 800, color: "#FFFFFF",
          letterSpacing: -2, textAlign: "center", padding: "0 60px",
        }}>
          J&apos;adore la Famille
        </div>

        <div style={{
          display: "flex", fontSize: 34, fontWeight: 500, color: "rgba(255,255,255,0.85)",
          marginTop: 20,
        }}>
          🇬🇦 La Marketplace du Gabon
        </div>
      </div>
    ),
    { ...size }
  );
}
