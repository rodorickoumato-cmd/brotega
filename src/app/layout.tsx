import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/store/cart";
import { Toaster } from "@/components/ui/Toaster";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brotega – La Marketplace du Gabon",
  description: "Achetez et vendez en toute confiance au Gabon. Produits locaux et internationaux livrés chez vous.",
  keywords: "marketplace gabon, e-commerce gabon, acheter gabon, vendre gabon, brotega",
  openGraph: {
    title: "Brotega – La Marketplace du Gabon",
    description: "Achetez et vendez en toute confiance au Gabon.",
    locale: "fr_GA",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={geist.variable}>
      <body className="min-h-screen flex flex-col bg-[#F7F8FA]">
        <CartProvider>
          {children}
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
