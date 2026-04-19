export type Database = {
  public: {
    Tables: {
      utilisateurs: {
        Row: {
          id: string;
          nom: string;
          email: string;
          telephone: string | null;
          ville: string | null;
          avatar_url: string | null;
          role: "acheteur" | "vendeur" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["utilisateurs"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["utilisateurs"]["Insert"]>;
      };
      vendeurs: {
        Row: {
          id: string;
          utilisateur_id: string;
          nom: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          ville: string;
          telephone: string | null;
          whatsapp: string | null;
          categories: string[];
          statut: "en_attente" | "verifie" | "suspendu";
          note: number;
          nb_avis: number;
          nb_produits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vendeurs"]["Row"], "id" | "note" | "nb_avis" | "nb_produits" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["vendeurs"]["Insert"]>;
      };
      produits: {
        Row: {
          id: string;
          vendeur_id: string;
          nom: string;
          slug: string;
          description: string;
          prix: number;
          prix_original: number | null;
          images: string[];
          categorie: string;
          sous_categorie: string | null;
          stock: number;
          unite: string | null;
          tags: string[];
          ville: string;
          est_nouveau: boolean;
          est_vedette: boolean;
          actif: boolean;
          note: number;
          nb_avis: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["produits"]["Row"], "id" | "note" | "nb_avis" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["produits"]["Insert"]>;
      };
      commandes: {
        Row: {
          id: string;
          utilisateur_id: string | null;
          vendeur_id: string | null;
          articles: unknown;
          total: number;
          statut: "en_attente" | "confirme" | "expedie" | "livre" | "annule";
          mode_paiement: "airtel_money" | "moov_money" | "especes" | "carte" | null;
          statut_paiement: "en_attente" | "paye" | "echec";
          adresse: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["commandes"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["commandes"]["Insert"]>;
      };
      abonnements: {
        Row: {
          id: string;
          vendeur_id: string;
          plan: "gratuit" | "mensuel" | "trimestriel" | "semestriel" | "annuel";
          prix: number;
          statut: "actif" | "expire" | "annule";
          date_debut: string;
          date_fin: string | null;
          max_produits: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["abonnements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["abonnements"]["Insert"]>;
      };
    };
  };
};

// Raccourcis utiles
export type Utilisateur = Database["public"]["Tables"]["utilisateurs"]["Row"];
export type Vendeur = Database["public"]["Tables"]["vendeurs"]["Row"];
export type Produit = Database["public"]["Tables"]["produits"]["Row"];
export type Commande = Database["public"]["Tables"]["commandes"]["Row"];
export type Abonnement = Database["public"]["Tables"]["abonnements"]["Row"];
