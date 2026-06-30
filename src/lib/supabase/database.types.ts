export type Database = {
  public: {
    Tables: {

      // ── UTILISATEURS ───────────────────────────────────────
      utilisateurs: {
        Row: {
          id: string;
          nom: string;
          email: string | null;
          email_verifie: boolean;
          telephone: string | null;
          whatsapp: string | null;
          marketing_opt_in: boolean;
          role: "acheteur" | "vendeur" | "livreur" | "admin";
          suspendu: boolean | null;
          motif_suspension: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          nom: string;
          email?: string | null;
          email_verifie?: boolean;
          telephone?: string | null;
          whatsapp?: string | null;
          marketing_opt_in?: boolean;
          role?: "acheteur" | "vendeur" | "livreur" | "admin";
          suspendu?: boolean | null;
          motif_suspension?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["utilisateurs"]["Insert"]>;
        Relationships: [];
      };

      // ── VENDEURS ───────────────────────────────────────────
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
          mobile_money_numero: string | null;
          mobile_money_verifie: boolean;
          categories: string[];
          statut: "en_attente" | "verifie" | "suspendu";
          note: number;
          nb_avis: number;
          nb_produits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          utilisateur_id: string;
          nom: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          ville: string;
          telephone?: string | null;
          whatsapp?: string | null;
          mobile_money_numero?: string | null;
          mobile_money_verifie?: boolean;
          categories?: string[];
          statut?: "en_attente" | "verifie" | "suspendu";
          note?: number;
          nb_avis?: number;
          nb_produits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendeurs"]["Insert"]>;
        Relationships: [];
      };

      // ── ABONNEMENTS ────────────────────────────────────────
      abonnements: {
        Row: {
          id: string;
          vendeur_id: string;
          plan: "gratuit" | "mensuel" | "trimestriel" | "semestriel" | "annuel";
          prix_xaf: number;
          statut: "en_attente_paiement" | "actif" | "expire" | "annule";
          max_produits: number;
          date_debut: string;
          date_fin: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendeur_id: string;
          plan: "gratuit" | "mensuel" | "trimestriel" | "semestriel" | "annuel";
          prix_xaf?: number;
          statut?: "en_attente_paiement" | "actif" | "expire" | "annule";
          max_produits?: number;
          date_debut?: string;
          date_fin?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["abonnements"]["Insert"]>;
        Relationships: [];
      };

      // ── PRODUITS ───────────────────────────────────────────
      produits: {
        Row: {
          id: string;
          vendeur_id: string;
          nom: string;
          description: string | null;
          prix: number;
          unite: string;
          stock: number | null;
          categorie: string | null;
          image: string | null;
          statut: "actif" | "inactif";
          prix_promo: number | null;
          promo_actif: boolean;
          promo_fin: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendeur_id: string;
          nom: string;
          slug?: string;
          description?: string | null;
          prix: number;
          unite?: string;
          stock?: number | null;
          categorie?: string | null;
          image?: string | null;
          statut?: "actif" | "inactif";
          prix_promo?: number | null;
          promo_actif?: boolean;
          promo_fin?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["produits"]["Insert"]>;
        Relationships: [];
      };

      // ── COMMANDES ──────────────────────────────────────────
      commandes: {
        Row: {
          id: string;
          code_court: string | null;
          utilisateur_id: string | null;
          vendeur_id: string | null;
          livreur_id: string | null;
          articles: unknown;
          total: number;
          frais_livraison: number;
          commission_xaf: number;
          statut: "en_attente_paiement" | "payee_escrow" | "confirmee_vendeur" | "en_livraison" | "livree" | "litige" | "remboursee" | "annulee";
          mode_paiement: "airtel_money" | "moov_money" | "especes" | null;
          statut_paiement: "en_attente" | "paye" | "echec";
          telephone_paiement: string | null;
          adresse: unknown;
          paye_at: string | null;
          livree_at: string | null;
          escrow_libere_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code_court?: string | null;
          utilisateur_id?: string | null;
          vendeur_id?: string | null;
          livreur_id?: string | null;
          articles: unknown;
          total: number;
          frais_livraison?: number;
          commission_xaf?: number;
          statut?: "en_attente_paiement" | "payee_escrow" | "confirmee_vendeur" | "en_livraison" | "livree" | "litige" | "remboursee" | "annulee";
          mode_paiement?: "airtel_money" | "moov_money" | "especes" | null;
          statut_paiement?: "en_attente" | "paye" | "echec";
          telephone_paiement?: string | null;
          adresse: unknown;
          paye_at?: string | null;
          livree_at?: string | null;
          escrow_libere_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["commandes"]["Insert"]>;
        Relationships: [];
      };

      // ── PAIEMENTS ──────────────────────────────────────────
      paiements: {
        Row: {
          id: string;
          commande_id: string | null;
          abonnement_id: string | null;
          provider: "airtel" | "moov" | "cash" | "mock";
          provider_ref: string | null;
          idempotency_key: string;
          montant_xaf: number;
          telephone: string | null;
          statut: "initie" | "en_attente" | "reussi" | "echec" | "rembourse";
          message_erreur: string | null;
          raw_callback: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          commande_id?: string | null;
          abonnement_id?: string | null;
          provider: "airtel" | "moov" | "cash" | "mock";
          provider_ref?: string | null;
          idempotency_key: string;
          montant_xaf: number;
          telephone?: string | null;
          statut?: "initie" | "en_attente" | "reussi" | "echec" | "rembourse";
          message_erreur?: string | null;
          raw_callback?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["paiements"]["Insert"]>;
        Relationships: [];
      };

      // ── LIVRAISONS ─────────────────────────────────────────
      livraisons: {
        Row: {
          id: string;
          commande_id: string;
          livreur_id: string | null;
          statut: "en_attente" | "assignee" | "en_route" | "livree" | "echec";
          note_livreur: string | null;
          code_confirmation: string | null;
          code_utilise_at: string | null;
          remuneration_xaf: number | null;
          remuneration_versee: boolean;
          remuneration_versee_at: string | null;
          client_telephone: string | null;
          notes: string | null;
          assignee_at: string | null;
          livree_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          commande_id: string;
          livreur_id?: string | null;
          statut?: "en_attente" | "assignee" | "en_route" | "livree" | "echec";
          note_livreur?: string | null;
          code_confirmation?: string | null;
          code_utilise_at?: string | null;
          remuneration_xaf?: number | null;
          remuneration_versee?: boolean;
          remuneration_versee_at?: string | null;
          client_telephone?: string | null;
          notes?: string | null;
          assignee_at?: string | null;
          livree_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["livraisons"]["Insert"]>;
        Relationships: [];
      };

      // ── MESSAGES ───────────────────────────────────────────
      messages: {
        Row: {
          id: string;
          commande_id: string;
          expediteur_id: string;
          contenu: string;
          lu: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          commande_id: string;
          expediteur_id: string;
          contenu: string;
          lu?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };

      // ── RÉCLAMATIONS ───────────────────────────────────────
      reclamations: {
        Row: {
          id: string;
          commande_id: string;
          utilisateur_id: string;
          motif: string;
          statut: "ouverte" | "en_cours" | "resolue_acheteur" | "resolue_vendeur" | "fermee";
          resolution: string | null;
          admin_id: string | null;
          resolue_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          commande_id: string;
          utilisateur_id: string;
          motif: string;
          statut?: "ouverte" | "en_cours" | "resolue_acheteur" | "resolue_vendeur" | "fermee";
          resolution?: string | null;
          admin_id?: string | null;
          resolue_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reclamations"]["Insert"]>;
        Relationships: [];
      };

      // ── PUSH SUBSCRIPTIONS ────────────────────────────────
      push_subscriptions: {
        Row: {
          id: string;
          utilisateur_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          utilisateur_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };

      // ── WALLETS ────────────────────────────────────────────
      wallets: {
        Row: {
          vendeur_id: string;
          balance_pending_xaf: number;
          balance_available_xaf: number;
          updated_at: string;
        };
        Insert: {
          vendeur_id: string;
          balance_pending_xaf?: number;
          balance_available_xaf?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wallets"]["Insert"]>;
        Relationships: [];
      };

      // ── WALLET_TRANSACTIONS ────────────────────────────────
      wallet_transactions: {
        Row: {
          id: string;
          vendeur_id: string;
          type: "credit_escrow" | "liberation" | "commission" | "retrait" | "remboursement" | "ajustement";
          montant_xaf: number;
          solde_pending_apres: number;
          solde_available_apres: number;
          commande_id: string | null;
          paiement_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendeur_id: string;
          type: "credit_escrow" | "liberation" | "commission" | "retrait" | "remboursement" | "ajustement";
          montant_xaf: number;
          solde_pending_apres: number;
          solde_available_apres: number;
          commande_id?: string | null;
          paiement_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wallet_transactions"]["Insert"]>;
        Relationships: [];
      };

      // ── CATEGORIES PRODUITS ────────────────────────────────────
      categories_produits: {
        Row: {
          slug: string;
          nom: string;
          icone: string;
          couleur: string;
          bg: string;
          ordre: number;
          actif: boolean;
          created_at: string;
        };
        Insert: {
          slug: string;
          nom: string;
          icone?: string;
          couleur?: string;
          bg?: string;
          ordre?: number;
          actif?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories_produits"]["Insert"]>;
        Relationships: [];
      };

      // ── TARIFS LIVRAISON ───────────────────────────────────────
      tarifs_livraison: {
        Row: { province_vendeur: string; province_acheteur: string; tarif_xaf: number };
        Insert: { province_vendeur: string; province_acheteur: string; tarif_xaf: number };
        Update: Partial<Database["public"]["Tables"]["tarifs_livraison"]["Insert"]>;
        Relationships: [];
      };

      // ── VILLES LIVRAISON ──────────────────────────────────────
      villes_livraison: {
        Row: { nom: string; province_code: string; supplement_xaf: number; actif: boolean };
        Insert: { nom: string; province_code: string; supplement_xaf?: number; actif?: boolean };
        Update: Partial<Database["public"]["Tables"]["villes_livraison"]["Insert"]>;
        Relationships: [];
      };

      // ── APP_CONFIG ─────────────────────────────────────────────
      app_config: {
        Row: {
          cle: string;
          valeur: unknown;
          description: string | null;
          categorie: string;
          modifie_le: string;
          modifie_par: string | null;
        };
        Insert: {
          cle: string;
          valeur: unknown;
          description?: string | null;
          categorie?: string;
          modifie_le?: string;
          modifie_par?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["app_config"]["Insert"]>;
        Relationships: [];
      };

    };

    Views: { [_ in never]: never };

    Functions: {
      crediter_wallet_escrow: {
        Args: { p_vendeur_id: string; p_montant: number; p_commande_id: string; p_paiement_id: string };
        Returns: void;
      };
      liberer_escrow: {
        Args: { p_vendeur_id: string; p_montant: number; p_commission: number; p_commande_id: string };
        Returns: void;
      };
      debiter_wallet_retrait: {
        Args: { p_vendeur_id: string; p_montant: number; p_description: string };
        Returns: Record<string, unknown>;
      };
      inserer_produit_si_limite_ok: {
        Args: { p_vendeur_id: string; p_max: number; p_nom: string; p_description: string | null; p_prix: number; p_categorie: string | null; p_image: string | null; p_unite: string; p_stock: number | null };
        Returns: Record<string, unknown>;
      };
    };

    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// ── Raccourcis ─────────────────────────────────────────────────
export type Utilisateur     = Database["public"]["Tables"]["utilisateurs"]["Row"];
export type Vendeur         = Database["public"]["Tables"]["vendeurs"]["Row"];
export type Abonnement      = Database["public"]["Tables"]["abonnements"]["Row"];
export type Produit         = Database["public"]["Tables"]["produits"]["Row"];
export type Commande        = Database["public"]["Tables"]["commandes"]["Row"];
export type Paiement        = Database["public"]["Tables"]["paiements"]["Row"];
export type Livraison       = Database["public"]["Tables"]["livraisons"]["Row"];
export type Message         = Database["public"]["Tables"]["messages"]["Row"];
export type Reclamation     = Database["public"]["Tables"]["reclamations"]["Row"];
export type Wallet          = Database["public"]["Tables"]["wallets"]["Row"];
export type WalletTransaction = Database["public"]["Tables"]["wallet_transactions"]["Row"];
export type AppConfigRow          = Database["public"]["Tables"]["app_config"]["Row"];

// ── CANDIDATURES LIVREUR ───────────────────────────────────────
// (table créée par migration 007)
export type CandidatureLivreur = {
  id: string;
  utilisateur_id: string;
  vehicule: "moto" | "velo" | "voiture" | "autre";
  zone: string;
  message: string | null;
  statut: "en_attente" | "approuvee" | "refusee";
  traite_par: string | null;
  traite_le: string | null;
  created_at: string;
};
