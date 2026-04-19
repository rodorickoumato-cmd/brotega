import { v2 as cloudinary } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit être une image." }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image trop lourde (max 5 Mo)." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "brotega/produits",
            transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto:good", fetch_format: "auto" }],
          },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Upload échoué"));
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        stream.end(buffer);
      }
    );

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error("Erreur upload Cloudinary:", err);
    return NextResponse.json({ error: "Erreur lors de l'upload. Veuillez réessayer." }, { status: 500 });
  }
}
