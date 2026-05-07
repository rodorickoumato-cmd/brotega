/**
 * Compresse une image côté client avec Canvas avant upload.
 * Réduit drastiquement la taille pour les connexions lentes au Gabon.
 */
export type ResultatCompression = {
  fichier: File;
  tailleAvant: number;  // octets
  tailleApres: number;  // octets
  reduction: number;    // pourcentage
  preview: string;      // data URL pour aperçu
};

export async function compresserImage(
  fichier: File,
  maxDimension = 800,
  qualite = 0.75
): Promise<ResultatCompression> {
  return new Promise((resolve, reject) => {
    if (!fichier.type.startsWith("image/")) {
      reject(new Error("Ce fichier n'est pas une image."));
      return;
    }

    const img = new window.Image();
    const blobUrl = URL.createObjectURL(fichier);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      let { width, height } = img;

      // Redimensionne si trop grand
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve({ fichier, tailleAvant: fichier.size, tailleApres: fichier.size, reduction: 0, preview: blobUrl }); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve({ fichier, tailleAvant: fichier.size, tailleApres: fichier.size, reduction: 0, preview: "" }); return; }

          const nomFichier = fichier.name.replace(/\.[^.]+$/, "") + ".jpg";
          const fichierCompresse = new File([blob], nomFichier, { type: "image/jpeg" });
          const preview = canvas.toDataURL("image/jpeg", qualite);
          const reduction = Math.round((1 - blob.size / fichier.size) * 100);

          resolve({
            fichier: fichierCompresse,
            tailleAvant: fichier.size,
            tailleApres: blob.size,
            reduction: Math.max(0, reduction),
            preview,
          });
        },
        "image/jpeg",
        qualite
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error("Impossible de lire l'image. Essayez un autre fichier."));
    };

    img.src = blobUrl;
  });
}

export function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}
